import { NextRequest, NextResponse } from 'next/server';
import { datalakeService } from '@/lib/datalake-simple';
import { prisma } from '@stephenadei/database';
import type { MainPageStudent, DriveStudent } from '@/lib/interfaces';
import { extractSubjectFromDatalakePath } from '@stephenadei/datalake';

// Helper function to add timeout to promises
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

// Helper function to check if two names are very similar (fuzzy matching)
// This handles cases like "Teresa" vs "Teressa" (double letters)
function areNamesSimilar(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  
  // Exact match after normalization
  if (n1 === n2) return true;
  
  // Remove consecutive duplicate letters and compare
  const normalize = (str: string) => str.replace(/(.)\1+/g, '$1');
  if (normalize(n1) === normalize(n2)) return true;
  
  // Check if one is a substring of the other (for very short names)
  if (n1.length <= 4 || n2.length <= 4) {
    if (n1.includes(n2) || n2.includes(n1)) return true;
  }
  
  // Simple Levenshtein-like check: if names differ by only 1-2 characters, consider similar
  const len1 = n1.length;
  const len2 = n2.length;
  if (Math.abs(len1 - len2) > 2) return false;
  
  // Count differences (simple character-by-character comparison)
  let differences = 0;
  const maxLen = Math.max(len1, len2);
  for (let i = 0; i < maxLen; i++) {
    if (n1[i] !== n2[i]) {
      differences++;
      if (differences > 2) return false;
    }
  }
  
  return differences <= 2;
}

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

    // Check if MinIO credentials are available
    const hasMinIOCredentials = !!(
      process.env.MINIO_ACCESS_KEY && 
      process.env.MINIO_SECRET_KEY
    );

    // Execute all queries in parallel using Promise.allSettled
    console.log(`🔍 Starting parallel search for: "${query}"`);
    
    const [dbResult, datalakeResult, calendarResult] = await Promise.allSettled([
      // 1. Database query
      prisma.student.findMany({
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
      }),
      // 2. MinIO notes search (with timeout)
      hasMinIOCredentials
        ? withTimeout(
            datalakeService.findStudentFolders(query),
            5000,
            'MinIO notes search timeout'
          ).catch((timeoutError) => {
            console.warn('⚠️ MinIO notes search timed out or failed');
            return [];
          })
        : Promise.resolve([]),
      // 3. MinIO calendar search (with timeout)
      hasMinIOCredentials
        ? withTimeout(
            datalakeService.findStudentsWithCalendarEvents(query),
            5000,
            'MinIO calendar search timeout'
          ).catch((timeoutError) => {
            console.warn('⚠️ MinIO calendar search timed out or failed');
            return [];
          })
        : Promise.resolve([]),
    ]);

    // Handle database results
    let dbStudents: Array<{ id: string; name: string; datalakePath: string | null }> = [];
    if (dbResult.status === 'fulfilled') {
      dbStudents = dbResult.value;
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

        // Use normalized name for deduplication (trim and lowercase)
        const normalizedName = student.name.toLowerCase().trim();
        const key = normalizedName;
        
        // Check for exact match first
        if (studentMap.has(key)) {
          const existing = studentMap.get(key)!;
          // Prefer the student with datalakePath (has notes)
          if (student.datalakePath && !existing.hasNotes) {
            studentMap.set(key, mainPageStudent);
            const existingIndex = results.findIndex(s => s.id === existing.id);
            if (existingIndex !== -1) {
              results[existingIndex] = mainPageStudent;
            }
          } else if (student.datalakePath && existing.hasNotes) {
            if (!existing.url && student.datalakePath) {
              existing.url = student.datalakePath;
            }
            if (!existing.subject && subject) {
              existing.subject = subject;
            }
          }
        } else {
          // Check for similar names (fuzzy matching) to handle spelling variations
          let foundSimilar = false;
          for (const [existingKey, existing] of studentMap.entries()) {
            if (areNamesSimilar(student.name, existing.displayName)) {
              foundSimilar = true;
              // Merge: prefer the one with datalakePath, or keep the first one found
              if (student.datalakePath && !existing.hasNotes) {
                // Replace with student that has notes
                studentMap.delete(existingKey);
                studentMap.set(key, mainPageStudent);
                const existingIndex = results.findIndex(s => s.id === existing.id);
                if (existingIndex !== -1) {
                  results[existingIndex] = mainPageStudent;
                }
              } else if (student.datalakePath && existing.hasNotes) {
                // Both have notes, merge information
                if (!existing.url && student.datalakePath) {
                  existing.url = student.datalakePath;
                }
                if (!existing.subject && subject) {
                  existing.subject = subject;
                }
              }
              // If new student doesn't have notes, keep existing (skip adding new one)
              break;
            }
          }
          
          if (!foundSimilar) {
            studentMap.set(key, mainPageStudent);
            results.push(mainPageStudent);
          }
        }
      }
    } else {
      console.error('❌ Database search failed:', dbResult.reason);
    }

    // Handle MinIO notes results
    let datalakeStudents: DriveStudent[] = [];
    if (datalakeResult.status === 'fulfilled') {
      datalakeStudents = datalakeResult.value;
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
    } else {
      console.error('❌ Datalake notes search failed:', datalakeResult.reason);
    }

    // Handle MinIO calendar results
    let calendarStudents: Array<{ name: string; calendarPath: string }> = [];
    if (calendarResult.status === 'fulfilled') {
      calendarStudents = calendarResult.value;
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
    } else {
      console.error('❌ Datalake calendar search failed:', calendarResult.reason);
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
