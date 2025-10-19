#!/usr/bin/env node

/**
 * Migrate Missing Students from Google Drive to Firestore
 * 
 * This script scans Google Drive for student folders and compares them with
 * existing Firestore students to identify and migrate missing students.
 */

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { config } from 'dotenv';
import { google } from 'googleapis';
import bcrypt from 'bcryptjs';

// Load environment variables
config({ path: '.env.local' });

// Initialize Firebase Admin
const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'stephen-s-aantekeningen',
  credential: applicationDefault(),
};

const app = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0];
const db = getFirestore(app);

// Google Drive API setup
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const NOTABILITY_FOLDER_NAME = 'Notability';
const PRIVELES_FOLDER_NAME = 'Priveles';

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.auth = null;
  }

  async initialize() {
    try {
      this.auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      this.auth.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });

      // Try to refresh the access token
      try {
        await this.auth.refreshAccessToken();
        console.log('✅ Google Drive access token refreshed successfully');
      } catch (refreshError) {
        console.error('❌ Failed to refresh Google Drive access token:', refreshError);
      }

      this.drive = google.drive({ version: 'v3', auth: this.auth });
      console.log('✅ Google Drive API initialized with OAuth2');
    } catch (error) {
      console.error('❌ Failed to initialize Google Drive API:', error);
      throw error;
    }
  }

  async getPrivelesFolder() {
    try {
      // Find the Notability folder first
      const notabilityResponse = await this.drive.files.list({
        q: `name='${NOTABILITY_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
      });

      if (!notabilityResponse.data.files || notabilityResponse.data.files.length === 0) {
        throw new Error(`Notability folder not found`);
      }

      const notabilityFolderId = notabilityResponse.data.files[0].id;

      // Find the Priveles folder inside Notability
      const privelesResponse = await this.drive.files.list({
        q: `'${notabilityFolderId}' in parents and name='${PRIVELES_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
      });

      if (!privelesResponse.data.files || !privelesResponse.data.files.length) {
        throw new Error(`Priveles folder not found inside Notability`);
      }

      return privelesResponse.data.files[0].id;
    } catch (error) {
      console.error('Error finding Priveles folder:', error);
      throw error;
    }
  }

  async findStudentFolders() {
    try {
      console.log('🔍 Scanning Google Drive folder structure...');
      
      const privelesFolderId = await this.getPrivelesFolder();
      console.log('📁 Found Priveles folder:', privelesFolderId);

      // Get all subject folders
      const subjectResponse = await this.drive.files.list({
        q: `'${privelesFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
      });

      if (!subjectResponse.data.files || !subjectResponse.data.files.length) {
        throw new Error('No subject folders found in Priveles');
      }

      console.log('📚 Found', subjectResponse.data.files.length, 'subject folders');

      const allStudents = [];

      // Process each subject folder
      for (const subjectFolder of subjectResponse.data.files) {
        const subjectName = subjectFolder.name;
        console.log('📖 Scanning subject:', subjectName);

        // Get all student folders in this subject
        const studentResponse = await this.drive.files.list({
          q: `'${subjectFolder.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: 'files(id, name)',
        });

        if (studentResponse.data.files && studentResponse.data.files.length > 0) {
          console.log('👥 Found', studentResponse.data.files.length, 'student folders in', subjectName);
          
          for (const studentFolder of studentResponse.data.files) {
            allStudents.push({
              id: studentFolder.id, // This is the Drive folder ID
              displayName: studentFolder.name,
              subject: subjectName,
              driveFolderId: studentFolder.id,
              driveFolderName: studentFolder.name,
            });
          }
        }
      }

      console.log('✅ Total students found:', allStudents.length);
      return allStudents;
    } catch (error) {
      console.error('Error finding student folders:', error);
      throw error;
    }
  }
}

async function getAllFirestoreStudents() {
  try {
    console.log('🔍 Fetching existing Firestore students...');
    
    const snapshot = await db.collection('students').get();
    const students = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      students.push({
        id: doc.id,
        displayName: data.displayName,
        driveFolderId: data.driveFolderId,
        subject: data.subject,
      });
    });
    
    console.log('✅ Found', students.length, 'students in Firestore');
    return students;
  } catch (error) {
    console.error('❌ Error fetching Firestore students:', error);
    return [];
  }
}

function findMissingStudents(driveStudents, firestoreStudents) {
  console.log('🔍 Comparing Drive vs Firestore students...');
  
  // Create a map of Firestore students by driveFolderId for quick lookup
  const firestoreByDriveId = new Map();
  firestoreStudents.forEach(student => {
    if (student.driveFolderId) {
      firestoreByDriveId.set(student.driveFolderId, student);
    }
  });
  
  // Find students that exist in Drive but not in Firestore
  const missingStudents = driveStudents.filter(driveStudent => {
    return !firestoreByDriveId.has(driveStudent.driveFolderId);
  });
  
  console.log('📊 Analysis:');
  console.log('  - Drive students:', driveStudents.length);
  console.log('  - Firestore students:', firestoreStudents.length);
  console.log('  - Missing students:', missingStudents.length);
  
  return missingStudents;
}

async function migrateStudent(driveStudent) {
  try {
    console.log(`🔄 Migrating student: ${driveStudent.displayName} (${driveStudent.subject})`);
    
    // Generate a random PIN for the student
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const pinHash = await bcrypt.hash(pin, 10);
    
    const studentData = {
      displayName: driveStudent.displayName,
      pinHash: pinHash,
      pinUpdatedAt: Timestamp.now(),
      driveFolderId: driveStudent.driveFolderId,
      driveFolderName: driveStudent.driveFolderName,
      subject: driveStudent.subject,
      folderConfirmed: false,
      folderLinkedAt: Timestamp.now(),
      folderConfirmedAt: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    // Add to Firestore
    const docRef = await db.collection('students').add(studentData);
    
    console.log(`✅ Migrated student: ${driveStudent.displayName} -> Firestore ID: ${docRef.id}`);
    console.log(`   PIN: ${pin} (save this for the student)`);
    
    return {
      firestoreId: docRef.id,
      driveStudent: driveStudent,
      pin: pin,
    };
  } catch (error) {
    console.error(`❌ Failed to migrate student ${driveStudent.displayName}:`, error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting missing students migration...');
    
    // Initialize Google Drive service
    const driveService = new GoogleDriveService();
    await driveService.initialize();
    
    // Get students from both sources
    const [driveStudents, firestoreStudents] = await Promise.all([
      driveService.findStudentFolders(),
      getAllFirestoreStudents(),
    ]);
    
    // Find missing students
    const missingStudents = findMissingStudents(driveStudents, firestoreStudents);
    
    if (missingStudents.length === 0) {
      console.log('🎉 All students are already migrated to Firestore!');
      return;
    }
    
    console.log('\n📋 Missing students to migrate:');
    missingStudents.forEach((student, index) => {
      console.log(`  ${index + 1}. ${student.displayName} (${student.subject}) - ${student.driveFolderId}`);
    });
    
    // Ask for confirmation
    console.log(`\n❓ Do you want to migrate ${missingStudents.length} missing students? (y/N)`);
    
    // For now, auto-migrate (you can add readline for interactive confirmation)
    const shouldMigrate = true; // Set to false to skip migration
    
    if (shouldMigrate) {
      console.log('\n🔄 Starting migration...');
      const migratedStudents = [];
      
      for (const student of missingStudents) {
        try {
          const result = await migrateStudent(student);
          migratedStudents.push(result);
        } catch (error) {
          console.error(`❌ Failed to migrate ${student.displayName}:`, error);
        }
      }
      
      console.log(`\n🎉 Migration completed!`);
      console.log(`✅ Successfully migrated: ${migratedStudents.length} students`);
      console.log(`❌ Failed migrations: ${missingStudents.length - migratedStudents.length} students`);
      
      if (migratedStudents.length > 0) {
        console.log('\n📝 Student PINs (save these):');
        migratedStudents.forEach(result => {
          console.log(`  ${result.driveStudent.displayName}: ${result.pin}`);
        });
      }
    } else {
      console.log('⏭️  Migration skipped.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
main();
