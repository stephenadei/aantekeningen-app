import { NextResponse } from 'next/server';
import { datalakeService } from '@/lib/datalake-simple';

export async function GET() {
  try {
    // Get metadata from datalake
    const students = await datalakeService.getAllStudentFolders();
    const totalStudents = students.length;
    
    // Count total files (approximate)
    let totalFiles = 0;
    for (const student of students.slice(0, 10)) { // Sample first 10 students
      const studentName = typeof student.name === 'string' ? student.name : String(student.name);
      const studentPath = await datalakeService.getStudentPath(studentName);
      if (studentPath) {
        const files = await datalakeService.listFilesInFolder(studentPath);
        totalFiles += files.length;
      }
    }
    
    return NextResponse.json({
      success: true,
      hasCachedMetadata: true,
      isCacheValid: true,
      lastUpdated: new Date().toISOString(),
      totalStudents,
      totalFiles: totalFiles * (totalStudents / Math.min(10, totalStudents)), // Extrapolate
      cacheAge: 0
    });
  } catch (error) {
    console.error('❌ Error in metadata status endpoint:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
