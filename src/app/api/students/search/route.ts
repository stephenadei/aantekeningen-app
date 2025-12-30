import { NextRequest, NextResponse } from 'next/server';
import { datalakeService } from '@/lib/datalake-simple';
import { prisma } from '@stephen/database';
import type { MainPageStudent } from '@/lib/interfaces';
import { extractSubjectFromDatalakePath } from '@stephen/datalake';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Search endpoint called');
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      console.log('❌ No query parameter provided');
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Searching for:', query);

    const results: MainPageStudent[] = [];
    const studentMap = new Map<string, MainPageStudent>(); // Key: lowercase name

    // 1. Search Prisma database first (finds ALL students, with or without datalakePath)
    try {
      console.log(`🔍 Querying database for: "${query}"`);
      const dbStudents = await prisma.student.findMany({
        where: {
          name: {
            contains: query,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          name: true,
          datalakePath: true,
        },
      });

      console.log(`✅ Found ${dbStudents.length} students in database`);

      for (const student of dbStudents) {
        const subject = extractSubjectFromDatalakePath(student.datalakePath);

        const mainPageStudent: MainPageStudent = {
          id: student.id,
          displayName: student.name,
          subject: subject || '',
          url: student.datalakePath || '',
          hasNotes: !!student.datalakePath,
          hasAppointments: false, // Will be updated when we check calendar events
        };

        const key = student.name.toLowerCase();
        studentMap.set(key, mainPageStudent);
        results.push(mainPageStudent);
      }
    } catch (dbError) {
      console.error('❌ Database search failed:', dbError);
      console.error('❌ Error details:', dbError instanceof Error ? dbError.message : String(dbError));
      // Continue with MinIO search even if database fails
    }

    // 2. Search MinIO for notes folders (supplement)
    try {
      const hasMinIOCredentials = !!(
        process.env.MINIO_ACCESS_KEY && 
        process.env.MINIO_SECRET_KEY
      );

      if (hasMinIOCredentials) {
        const datalakeStudents = await datalakeService.findStudentFolders(query);
        console.log(`✅ Found ${datalakeStudents.length} students with notes in Datalake`);

        for (const student of datalakeStudents) {
          const key = student.name.toLowerCase();
          
          // If student already exists in map (from database), update hasNotes
          if (studentMap.has(key)) {
            const existing = studentMap.get(key)!;
            existing.hasNotes = true;
            if (!existing.subject) {
              existing.subject = student.subject;
            }
            if (!existing.url && student.url) {
              existing.url = student.url;
            }
          } else {
            // New student from MinIO (not in database yet)
            const mainPageStudent: MainPageStudent = {
              id: student.id, // Use datalake path as ID for now
              displayName: student.name,
              subject: student.subject,
              url: student.url,
              hasNotes: true,
              hasAppointments: false,
            };
            studentMap.set(key, mainPageStudent);
            results.push(mainPageStudent);
          }
        }
      }
    } catch (datalakeError) {
      console.error('❌ Datalake notes search failed:', datalakeError);
      // Continue with calendar search
    }

    // 3. Search MinIO for calendar events (supplement)
    try {
      const hasMinIOCredentials = !!(
        process.env.MINIO_ACCESS_KEY && 
        process.env.MINIO_SECRET_KEY
      );

      if (hasMinIOCredentials) {
        const calendarStudents = await datalakeService.findStudentsWithCalendarEvents(query);
        console.log(`✅ Found ${calendarStudents.length} students with calendar events in Datalake`);

        for (const student of calendarStudents) {
          const key = student.name.toLowerCase();
          
          // If student already exists in map, update hasAppointments
          if (studentMap.has(key)) {
            const existing = studentMap.get(key)!;
            existing.hasAppointments = true;
          } else {
            // New student from calendar (not in database or notes yet)
            const mainPageStudent: MainPageStudent = {
              id: `calendar-${student.name}`, // Temporary ID
              displayName: student.name,
              subject: '',
              url: '',
              hasNotes: false,
              hasAppointments: true,
            };
            studentMap.set(key, mainPageStudent);
            results.push(mainPageStudent);
          }
        }
      }
    } catch (calendarError) {
      console.error('❌ Datalake calendar search failed:', calendarError);
      // Continue anyway
    }

    // Deduplicate by name (case-insensitive) - already handled by Map
    const finalResults = Array.from(studentMap.values());

    console.log(`✅ Total unique students found: ${finalResults.length}`);

    return NextResponse.json({
      success: true,
      students: finalResults,
      count: finalResults.length,
      sources: {
        database: results.filter(s => s.id && !s.id.startsWith('calendar-')).length,
        notes: results.filter(s => s.hasNotes).length,
        calendar: results.filter(s => s.hasAppointments).length,
      }
    });

  } catch (error) {
    console.error('❌ Error searching students:', error);
    
    // Provide more detailed error information
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to search students',
        ...errorDetails
      },
      { status: 500 }
    );
  }
}
