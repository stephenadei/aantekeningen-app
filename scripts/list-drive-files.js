import { GoogleDriveService } from '../src/lib/google-drive-simple.ts';

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
