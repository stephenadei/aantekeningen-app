#!/usr/bin/env node

/**
 * List Students from Google Drive Structure
 * 
 * This script scans the Google Drive folder structure and lists all found students
 * without trying to save them to Firestore.
 */

import { config } from 'dotenv';
import { google } from 'googleapis';

// Load environment variables
config({ path: '.env.local' });

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
      // Use OAuth2 credentials
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

async function listStudentsFromDrive() {
  try {
    console.log('🚀 Listing students from Google Drive structure...');

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

    console.log('\n📋 All students found in Google Drive:');
    console.log('=' .repeat(80));
    
    // Group by subject
    const studentsBySubject = driveStudents.reduce((acc, student) => {
      if (!acc[student.subject]) {
        acc[student.subject] = [];
      }
      acc[student.subject].push(student);
      return acc;
    }, {});

    // Display by subject
    Object.entries(studentsBySubject).forEach(([subject, students]) => {
      console.log(`\n📚 ${subject} (${students.length} students):`);
      students.forEach(student => {
        console.log(`  • ${student.displayName}`);
        console.log(`    📁 Folder ID: ${student.driveFolderId}`);
        console.log(`    🔗 URL: ${student.url}`);
      });
    });

    console.log('\n' + '=' .repeat(80));
    console.log(`🎉 Found ${driveStudents.length} total students across ${Object.keys(studentsBySubject).length} subjects`);
    
    console.log('\n💡 Next steps:');
    console.log('1. Set up Firebase credentials to save these students to Firestore');
    console.log('2. Run "npm run init-students" to migrate them to the database');
    console.log('3. Or use the hybrid search API that falls back to Google Drive');

  } catch (error) {
    console.error('❌ Error listing students:', error);
    process.exit(1);
  }
}

// Run the script
listStudentsFromDrive();
