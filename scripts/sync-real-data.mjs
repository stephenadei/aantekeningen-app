#!/usr/bin/env node

/**
 * Sync Real Google Drive Data to Database
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(projectRoot, '.env.local') });
dotenv.config({ path: path.resolve(projectRoot, '.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncRealData() {
  console.log('🚀 Starting real data sync from Google Drive...');
  console.log('📋 Configuration check:');
  console.log(`   Client ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Client Secret: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Refresh Token: ${process.env.GOOGLE_REFRESH_TOKEN ? '✅ Set' : '❌ Missing'}`);
  console.log('');

  try {
    // First, let's test the Google Drive API by making a direct call
    console.log('🧪 Testing Google Drive API access...');
    
    const { google } = await import('googleapis');
    
    // Set up OAuth2 client
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Set the refresh token
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      auth.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
    }

    const drive = google.drive({ version: 'v3', auth });

    // Test by listing files in root
    console.log('📁 Testing Drive API access...');
    await drive.files.list({
      pageSize: 1,
      fields: 'files(id, name)',
    });

    console.log('✅ Google Drive API connection successful!');
    console.log('');

    // Now let's find the Notability folder
    console.log('🔍 Looking for Notability folder...');
    const notabilityResponse = await drive.files.list({
      q: "name='Notability' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name)',
      pageSize: 1,
    });

    if (!notabilityResponse.data.files || notabilityResponse.data.files.length === 0) {
      console.log('❌ Notability folder not found!');
      console.log('   Please make sure you have a "Notability" folder in your Google Drive root');
      return;
    }

    const notabilityFolderId = notabilityResponse.data.files[0].id;
    console.log(`✅ Found Notability folder: ${notabilityFolderId}`);
    console.log('');

    // Find Priveles folder
    console.log('🔍 Looking for Priveles folder...');
    const privelesResponse = await drive.files.list({
      q: `name='Priveles' and mimeType='application/vnd.google-apps.folder' and '${notabilityFolderId}' in parents and trashed=false`,
      fields: 'files(id, name)',
      pageSize: 1,
    });

    if (!privelesResponse.data.files || privelesResponse.data.files.length === 0) {
      console.log('❌ Priveles folder not found in Notability!');
      console.log('   Please make sure you have a "Priveles" folder inside your "Notability" folder');
      return;
    }

    const privelesFolderId = privelesResponse.data.files[0].id;
    console.log(`✅ Found Priveles folder: ${privelesFolderId}`);
    console.log('');

    // Get subject folders
    console.log('📚 Getting subject folders...');
    const subjectFoldersResponse = await drive.files.list({
      q: `'${privelesFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
    });

    const subjectFolders = subjectFoldersResponse.data.files || [];
    console.log(`✅ Found ${subjectFolders.length} subject folders:`);
    subjectFolders.forEach(folder => {
      console.log(`   - ${folder.name}`);
    });
    console.log('');

    // Get all student folders
    console.log('👥 Getting student folders...');
    const allStudents = [];

    for (const subjectFolder of subjectFolders) {
      const studentFoldersResponse = await drive.files.list({
        q: `'${subjectFolder.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
      });

      const studentFolders = studentFoldersResponse.data.files || [];
      console.log(`   ${subjectFolder.name}: ${studentFolders.length} students`);
      
      for (const studentFolder of studentFolders) {
        allStudents.push({
          id: studentFolder.id,
          name: studentFolder.name,
          subject: subjectFolder.name,
          url: `https://drive.google.com/drive/folders/${studentFolder.id}`
        });
      }
    }

    console.log(`✅ Found ${allStudents.length} total students`);
    console.log('');

    if (allStudents.length === 0) {
      console.log('⚠️  No students found. Check your folder structure:');
      console.log('   Notability → Priveles → [Subject Folders] → [Student Folders]');
      return;
    }

    // Clear existing data
    console.log('🗑️  Clearing existing database...');
    await prisma.note.deleteMany();
    await prisma.student.deleteMany();
    await prisma.unlinkedFolder.deleteMany();
    console.log('✅ Database cleared');
    console.log('');

    // Add students to database (handle duplicates by adding subject to name)
    console.log('💾 Adding students to database...');
    const uniqueStudents = new Map();
    
    for (const student of allStudents) {
      // Create unique display name by combining name and subject
      const uniqueName = `${student.name} (${student.subject})`;
      
      if (!uniqueStudents.has(uniqueName)) {
        uniqueStudents.set(uniqueName, student);
      }
    }
    
    for (const [uniqueName, student] of uniqueStudents) {
      await prisma.student.create({
        data: {
          displayName: uniqueName,
          pinHash: 'temp_hash', // Will be updated when PIN is set
          subject: student.subject,
          driveFolderId: student.id,
          driveFolderName: student.name,
          folderConfirmed: false, // Needs manual confirmation
          folderLinkedAt: new Date(),
        },
      });
      console.log(`   ✅ Added: ${uniqueName}`);
    }

    console.log('');
    console.log('🎉 Real data sync completed!');
    console.log(`   ${uniqueStudents.size} unique students added to database`);
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Go to admin panel → Students');
    console.log('   2. Confirm folder links for each student');
    console.log('   3. Set PINs for students');
    console.log('   4. Sync files from Drive folders');

  } catch (error) {
    console.error('❌ Error syncing real data:', error);
    console.log('');
    console.log('🔧 Common issues:');
    console.log('   1. Invalid refresh token - try re-authenticating');
    console.log('   2. Missing folder structure in Google Drive');
    console.log('   3. Network connectivity issues');
    console.log('   4. Google Drive API permissions');
  } finally {
    await prisma.$disconnect();
  }
}

syncRealData()
  .then(() => {
    console.log('');
    console.log('🏁 Sync completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
