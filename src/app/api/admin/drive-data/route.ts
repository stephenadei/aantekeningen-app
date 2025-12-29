import { NextResponse } from 'next/server';
import { getLoginAudits, getAllStudents } from '@/lib/firestore';
import { isOk } from '@/lib/types';

export async function GET() {
  try {
    // Get all students
    const studentsResult = await getAllStudents();
    const students = isOk(studentsResult) ? studentsResult.data : [];

    // Get audit logs
    const auditsResult = await getLoginAudits();
    const audits = isOk(auditsResult) ? auditsResult.data : [];

    // Calculate basic stats
    const stats = {
      totalStudents: students.length,
      totalAudits: audits.length,
      lastSync: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      students,
      stats
    });
  } catch (error) {
    console.error('Error fetching drive data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch drive data' },
      { status: 500 }
    );
  }
}
