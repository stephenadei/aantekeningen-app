#!/usr/bin/env node
/**
 * Check AI Data Status
 * Shows how many files have AI metadata and which students need analysis
 */

/**
 * Check AI Data Status
 * Uses API endpoints to check AI metadata status
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

async function checkAIDataStatus() {
  console.log('🔍 Checking AI Data Status...\n');
  console.log(`Using API: ${API_BASE_URL}\n`);

  try {
    // Get all students from datalake via API
    const searchResponse = await fetch(`${API_BASE_URL}/api/students/search?q=`);
    if (!searchResponse.ok) {
      throw new Error(`Failed to search students: ${searchResponse.statusText}`);
    }
    const searchData = await searchResponse.json();
    const students = searchData.students || [];
    console.log(`📚 Found ${students.length} students in datalake\n`);

    let totalFiles = 0;
    let filesWithAI = 0;
    let filesWithoutAI = 0;
    const studentsNeedingAnalysis = [];

    for (const student of students) {
      const studentName = student.name;
      const studentId = student.id; // datalake path

      // Get files from datalake via API
      const encodedId = encodeURIComponent(studentId);
      const filesResponse = await fetch(`${API_BASE_URL}/api/students/${encodedId}/files`);
      if (!filesResponse.ok) {
        console.warn(`⚠️  Failed to get files for ${studentName}: ${filesResponse.statusText}`);
        continue;
      }
      const filesData = await filesResponse.json();
      const files = filesData.files || [];
      totalFiles += files.length;

      // Check which files have AI metadata (summary field)
      const metadataMap = new Map();

      let studentFilesWithAI = 0;
      let studentFilesWithoutAI = 0;

      for (const file of files) {
        // Check if file has AI metadata (summary, keywords, etc.)
        if (file.summary && file.keywords && file.keywords.length > 0) {
          studentFilesWithAI++;
          filesWithAI++;
        } else {
          studentFilesWithoutAI++;
          filesWithoutAI++;
        }
      }

      if (studentFilesWithoutAI > 0) {
        studentsNeedingAnalysis.push({
          name: studentName,
          id: studentId,
          totalFiles: files.length,
          withAI: studentFilesWithAI,
          withoutAI: studentFilesWithoutAI,
        });
      }
    }

    // Print summary
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║     AI DATA STATUS SUMMARY                               ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    console.log(`📊 Total Statistics:`);
    console.log(`   • Total students: ${students.length}`);
    console.log(`   • Total files: ${totalFiles}`);
    console.log(`   • Files with AI metadata: ${filesWithAI} (${((filesWithAI / totalFiles) * 100).toFixed(1)}%)`);
    console.log(`   • Files without AI metadata: ${filesWithoutAI} (${((filesWithoutAI / totalFiles) * 100).toFixed(1)}%)\n`);

    if (studentsNeedingAnalysis.length > 0) {
      console.log(`⚠️  Students needing AI analysis: ${studentsNeedingAnalysis.length}\n`);
      console.log('📋 Top 10 students needing analysis:');
      studentsNeedingAnalysis
        .sort((a, b) => b.withoutAI - a.withoutAI)
        .slice(0, 10)
        .forEach((student, index) => {
          console.log(`   ${index + 1}. ${student.name}: ${student.withoutAI}/${student.totalFiles} files need analysis`);
        });
    } else {
      console.log('✅ All files have AI metadata!\n');
    }

    return {
      totalStudents: students.length,
      totalFiles,
      filesWithAI,
      filesWithoutAI,
      studentsNeedingAnalysis: studentsNeedingAnalysis.length,
    };
  } catch (error) {
    console.error('❌ Error checking AI data status:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkAIDataStatus()
    .then(() => {
      console.log('\n✅ Status check complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}

export { checkAIDataStatus };

