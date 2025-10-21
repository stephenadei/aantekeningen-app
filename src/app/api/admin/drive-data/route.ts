import { NextResponse } from 'next/server';
import { getLoginAudits } from '@/lib/firestore';
import { db } from '@/lib/firebase-admin';
import { isOk } from '@/lib/types';

export async function GET() {
  try {
    // Get all students from Firestore
    const studentsSnapshot = await db.collection('students').get();
    const students = studentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

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
