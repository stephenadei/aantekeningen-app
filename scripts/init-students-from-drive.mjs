#!/usr/bin/env node

/**
 * Initialize Students from Google Drive Structure
 * 
 * This script scans the Google Drive folder structure and creates student records in Firestore
 * based on the existing folder hierarchy.
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';

// Load environment variables
config({ path: '.env.local' });

// Initialize Firebase Admin
const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  // Use Application Default Credentials if available, otherwise use explicit config
  ...(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY ? {
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  } : {}),
};

const app = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0];
const db = getFirestore(app);

// Google Drive API setup (simplified version)
import { google } from 'googleapis';

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
      // Use OAuth2 credentials instead of service account
      this.auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Set the refresh token
      this.auth.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });

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

      if (!privelesResponse.data.files || privelesResponse.data.files.length === 0) {
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
      console.log(`📁 Found Priveles folder: ${privelesFolderId}`);

      // Get all subject folders
      const subjectFolders = await this.drive.files.list({
        q: `'${privelesFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
      });

      console.log(`📚 Found ${subjectFolders.data.files?.length || 0} subject folders`);

      const allStudents = [];

      // Search through each subject folder
      for (const subjectFolder of subjectFolders.data.files || []) {
        const subjectName = subjectFolder.name;
        console.log(`📖 Scanning subject: ${subjectName}`);
        
        // Look for student folders within this subject
        const studentFolders = await this.drive.files.list({
          q: `'${subjectFolder.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: 'files(id, name)',
        });

        console.log(`👥 Found ${studentFolders.data.files?.length || 0} student folders in ${subjectName}`);

        for (const studentFolder of studentFolders.data.files || []) {
          allStudents.push({
            id: studentFolder.id,
            displayName: studentFolder.name,
            subject: subjectName,
            driveFolderId: studentFolder.id,
            driveFolderName: studentFolder.name,
            url: `https://drive.google.com/drive/folders/${studentFolder.id}`
          });
        }
      }

      console.log(`✅ Total students found: ${allStudents.length}`);
      return allStudents;
    } catch (error) {
      console.error('Error finding student folders:', error);
      throw error;
    }
  }
}

async function initializeStudentsFromDrive() {
  try {
    console.log('🚀 Initializing students from Google Drive structure...');

    // Check if we have Google Drive credentials
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
      console.error('❌ Google Drive OAuth credentials not found in environment variables');
      console.log('📋 Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN');
      process.exit(1);
    }

    // Initialize Google Drive service
    const driveService = new GoogleDriveService();
    await driveService.initialize();

    // Get all students from Google Drive
    const driveStudents = await driveService.findStudentFolders();

    if (driveStudents.length === 0) {
      console.log('⚠️ No students found in Google Drive structure');
      return;
    }

    // Check existing students in Firestore
    if (!db) {
      console.error('❌ Firestore database not initialized');
      process.exit(1);
    }

    const existingStudentsSnapshot = await db.collection('students').get();
    const existingStudents = existingStudentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📊 Found ${existingStudents.length} existing students in Firestore`);

    // Create students that don't exist yet
    const studentsToCreate = [];
    const batch = db.batch();

    for (const driveStudent of driveStudents) {
      // Check if student already exists (by driveFolderId)
      const existingStudent = existingStudents.find(s => s.driveFolderId === driveStudent.driveFolderId);
      
      if (!existingStudent) {
        // Generate a PIN for new students
        const pin = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit PIN
        const pinHash = await bcrypt.hash(pin, 10);

        const studentData = {
          displayName: driveStudent.displayName,
          pinHash: pinHash,
          pinUpdatedAt: Timestamp.now(),
          driveFolderId: driveStudent.driveFolderId,
          driveFolderName: driveStudent.driveFolderName,
          subject: driveStudent.subject,
          folderConfirmed: true, // Auto-confirm since it exists in Drive
          folderLinkedAt: Timestamp.now(),
          folderConfirmedAt: Timestamp.now(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const docRef = db.collection('students').doc();
        batch.set(docRef, studentData);
        
        studentsToCreate.push({
          ...studentData,
          id: docRef.id,
          pin: pin, // Store PIN for display
        });

        console.log(`➕ Will create student: ${driveStudent.displayName} (PIN: ${pin})`);
      } else {
        console.log(`✅ Student already exists: ${driveStudent.displayName}`);
      }
    }

    if (studentsToCreate.length > 0) {
      await batch.commit();
      console.log(`\n🎉 Created ${studentsToCreate.length} new students in Firestore!`);
      
      console.log('\n📋 New students created:');
      studentsToCreate.forEach(student => {
        console.log(`  - ${student.displayName} (${student.subject}) - PIN: ${student.pin}`);
      });
    } else {
      console.log('\n✅ All students already exist in Firestore');
    }

    console.log('\n🚀 Student initialization completed!');
    console.log('📝 Students can now be found via the search API');

  } catch (error) {
    console.error('❌ Error initializing students:', error);
    process.exit(1);
  }
}

// Run the script
initializeStudentsFromDrive();
