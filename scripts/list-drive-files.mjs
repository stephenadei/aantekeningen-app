import { google } from 'googleapis';

// Google Drive API configuration
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

// Constants
const NOTABILITY_FOLDER_NAME = 'Notability';
const PRIVELES_FOLDER_NAME = 'Priveles';

// Cache configuration
const CACHE_DURATION_HOURS = 12;
const CACHE_KEY_STUDENTS = 'cached_students';
const CACHE_KEY_FILES = 'cached_files_';

// In-memory cache
const memoryCache = new Map();

class GoogleDriveService {
  constructor() {
    this.drive = null;
  }

  async ensureInitialized() {
    if (this.drive) return;

    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        },
        scopes: SCOPES,
      });

      this.drive = google.drive({ version: 'v3', auth });
      console.log('✅ Google Drive API initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Google Drive API:', error.message);
      throw error;
    }
  }

  getCache(key) {
    const cached = memoryCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    const cacheAge = now - cached.timestamp;
    const maxAge = CACHE_DURATION_HOURS * 60 * 60 * 1000;

    if (cacheAge > maxAge) {
      memoryCache.delete(key);
      return null;
    }

    return cached.data;
  }

  setCache(key, data) {
    memoryCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  async findStudentFolders(needle = '') {
    try {
      const cacheKey = CACHE_KEY_STUDENTS + needle;
      const cachedData = this.getCache(cacheKey);
      
      if (cachedData) {
        console.log('📋 Using cached student data');
        return cachedData;
      }

      console.log('🔍 Fetching student folders from Google Drive...');
      await this.ensureInitialized();

      // Find the main Priveles folder
      const privelesQuery = `name='${PRIVELES_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const privelesResponse = await this.drive.files.list({
        q: privelesQuery,
        fields: 'files(id, name)',
      });

      if (!privelesResponse.data.files || privelesResponse.data.files.length === 0) {
        console.log('❌ Priveles folder not found');
        return [];
      }

      const privelesFolderId = privelesResponse.data.files[0].id;
      console.log(`📁 Found Priveles folder: ${privelesFolderId}`);

      // Find student folders within Priveles
      const studentQuery = `'${privelesFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const studentResponse = await this.drive.files.list({
        q: studentQuery,
        fields: 'files(id, name)',
        orderBy: 'name',
      });

      const students = [];
      for (const folder of studentResponse.data.files || []) {
        const folderName = folder.name;
        
        // Skip if needle doesn't match
        if (needle && !folderName.toLowerCase().includes(needle.toLowerCase())) {
          continue;
        }

        // Extract subject from folder name (assuming format like "StudentName - Subject")
        const subjectMatch = folderName.match(/- (.+)$/);
        const subject = subjectMatch ? subjectMatch[1].trim() : 'Unknown';

        students.push({
          id: folder.id,
          name: folderName,
          subject: subject,
          url: `https://drive.google.com/drive/folders/${folder.id}`
        });
      }

      this.setCache(cacheKey, students);
      return students;

    } catch (error) {
      console.error('❌ Error finding student folders:', error.message);
      return [];
    }
  }

  async listFilesInFolder(folderId) {
    try {
      const cacheKey = CACHE_KEY_FILES + folderId;
      const cachedData = this.getCache(cacheKey);
      
      if (cachedData) {
        console.log(`📋 Using cached file data for folder: ${folderId}`);
        return cachedData;
      }

      console.log(`🔍 Fetching files for folder: ${folderId}`);
      await this.ensureInitialized();

      const files = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, modifiedTime, size, mimeType)',
        orderBy: 'modifiedTime desc',
      });

      const fileList = [];
      for (const file of files.data.files || []) {
        fileList.push({
          id: file.id,
          name: file.name,
          title: file.name,
          size: file.size,
          modifiedTime: file.modifiedTime,
          mimeType: file.mimeType,
          url: `https://drive.google.com/file/d/${file.id}/view`,
          downloadUrl: `https://drive.google.com/uc?export=download&id=${file.id}`,
          viewUrl: `https://drive.google.com/file/d/${file.id}/preview`,
          thumbnailUrl: `https://drive.google.com/thumbnail?id=${file.id}&sz=w400-h300`,
        });
      }

      this.setCache(cacheKey, fileList);
      return fileList;

    } catch (error) {
      console.error(`❌ Error listing files in folder ${folderId}:`, error.message);
      return [];
    }
  }
}

async function listDriveFiles() {
  try {
    console.log('🚀 Starting Google Drive file listing...');
    
    const driveService = new GoogleDriveService();
    
    // First, let's find student folders
    console.log('\n📁 Searching for student folders...');
    const students = await driveService.findStudentFolders('');
    
    console.log(`\n✅ Found ${students.length} student folders:`);
    students.forEach((student, index) => {
      console.log(`${index + 1}. ${student.name} (${student.subject})`);
      console.log(`   ID: ${student.id}`);
      console.log(`   URL: ${student.url}`);
      console.log('');
    });
    
    // Now let's list files for each student
    console.log('\n📄 Listing files for each student...');
    
    for (const student of students) {
      console.log(`\n🔍 Files for ${student.name}:`);
      
      try {
        const files = await driveService.listFilesInFolder(student.id);
        
        if (files.length === 0) {
          console.log('   No files found');
          continue;
        }
        
        files.forEach((file, index) => {
          console.log(`   ${index + 1}. ${file.name}`);
          console.log(`      ID: ${file.id}`);
          console.log(`      Size: ${file.size ? (file.size / 1024).toFixed(1) + ' KB' : 'Unknown'}`);
          console.log(`      Modified: ${file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'Unknown'}`);
          console.log(`      Type: ${file.mimeType}`);
          console.log(`      View URL: ${file.viewUrl}`);
          console.log('');
        });
        
      } catch (error) {
        console.error(`   ❌ Error listing files for ${student.name}:`, error.message);
      }
    }
    
    console.log('\n✅ Drive file listing completed!');
    
  } catch (error) {
    console.error('❌ Error listing drive files:', error);
  }
}

// Run the script
listDriveFiles();
