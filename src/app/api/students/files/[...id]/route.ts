import { NextRequest, NextResponse } from 'next/server';
import { datalakeService } from '@/lib/datalake-simple';
import { getFileMetadata, isFileMetadataFresh } from '@/lib/cache';
import { getStudent, getStudentByDriveFolderId, validateFirestoreStudentId, validateDriveFolderId } from '@/lib/database';
import { backgroundSyncService } from '@/lib/background-sync';
import { prisma } from '@stephenadei/database';
import { formatFileTitle } from '@/lib/title-formatter';
import {
  StudentIdType,
  detectIdType,
  FirestoreStudentId,
  DriveFolderId,
  createCleanFileName,
} from '@/lib/types';
import { createErrorResponse, handleUnknownError, InvalidStudentIdError } from '@/lib/errors';
import { resolveStudentRequest } from '@/lib/student-resolution';
import { sliceByOffset } from '@/lib/pagination';

// Identity + location resolution lives in one tested seam (student-resolution.ts).
// The route only maps the resolution outcome to its HTTP shape.
const identityDeps = {
  getStudentPath: (name: string, subject?: string) => datalakeService.getStudentPath(name, subject),
  detectIdType,
  validateFirestoreStudentId,
  validateDriveFolderId,
  getStudent: (id: string) => getStudent(id as FirestoreStudentId),
  getStudentByDriveFolderId: (id: string) => getStudentByDriveFolderId(id as DriveFolderId),
  findPrismaStudentById: async (id: string) =>
    prisma.student.findUnique({ where: { id }, select: { name: true, datalakePath: true } }),
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string[] }> }
) {
  try {
    const { id: idArray } = await params;
    const studentId = idArray.join('/'); // Join array segments back into path
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const forceRefresh = searchParams.get('refresh') === 'true';
    const idType = searchParams.get('idType') as StudentIdType | null;

    if (!studentId) {
      return NextResponse.json(
        createErrorResponse(new InvalidStudentIdError('', 'unknown')),
        { status: 400 }
      );
    }

    const resolution = await resolveStudentRequest(studentId, idType, identityDeps);
    if (resolution.kind === 'invalid') {
      return NextResponse.json(createErrorResponse(handleUnknownError(resolution.error)), { status: 400 });
    }
    if (resolution.kind === 'not-found') {
      return NextResponse.json(
        createErrorResponse(new InvalidStudentIdError(resolution.message, idType || 'unknown')),
        { status: 404 }
      );
    }
    if (resolution.kind === 'no-files') {
      // Student exists but has no datalake files yet.
      return NextResponse.json({ success: true, files: [], studentName: resolution.studentName, hasMore: false });
    }
    if (resolution.kind === 'no-notes') {
      // Prisma student record exists but has no datalakePath yet.
      return NextResponse.json({
        success: true,
        files: [],
        count: 0,
        message: 'Deze student heeft nog geen aantekeningen',
        studentName: resolution.studentName,
        hasNotes: false,
      });
    }

    const { datalakePath, studentName, idType: resolvedIdType } = resolution;

    // List files using the full datalake path (pass path as first param, empty string as second)
    const allFiles = await datalakeService.listFilesInFolder(datalakePath, '');

    // Optionally enrich with cache metadata (AI analysis, etc.)
    if (!forceRefresh) {
      const cachedFiles = await getFileMetadata(studentId);
      if (cachedFiles.length > 0) {
        const cacheMap = new Map(cachedFiles.map(f => [f.id, f]));

        // Merge cache metadata with datalake files
        const enrichedFiles = allFiles.map(file => {
          const cached = cacheMap.get(file.id);
          if (cached) {
            const enrichedFile: typeof file = {
              ...file,
              topic: cached.topic,
              level: cached.level,
              schoolYear: cached.schoolYear,
              keywords: cached.keywords,
              summary: cached.summary,
              summaryEn: cached.summaryEn,
              topicEn: cached.topicEn,
              keywordsEn: cached.keywordsEn,
              aiAnalyzedAt: cached.aiAnalyzedAt ? new Date(cached.aiAnalyzedAt) : undefined,
            };
            const formattedTitle = formatFileTitle(enrichedFile);
            return { ...enrichedFile, title: createCleanFileName(formattedTitle) };
          }
          const formattedTitle = formatFileTitle(file);
          return { ...file, title: createCleanFileName(formattedTitle) };
        });

        // Check if cache is fresh, if not trigger background refresh
        const isFresh = await isFileMetadataFresh(studentId, 6); // 6 hours
        if (!isFresh) {
          backgroundSyncService.forceSyncStudent(studentId).catch(error => {
            console.error('Background sync failed:', error);
          });
        }

        const { items: files, hasMore } = sliceByOffset(enrichedFiles, limit, offset);

        return NextResponse.json({
          success: true,
          files,
          count: files.length,
          totalCount: enrichedFiles.length,
          hasMore,
          fromCache: false,
          cacheEnriched: true,
          cacheFresh: isFresh,
          studentName,
          idType: resolvedIdType,
        });
      }
    }

    // Apply pagination if requested
    const { items: files, hasMore } = sliceByOffset(allFiles, limit, offset);

    // Trigger background sync to update datalake metadata (non-blocking, optional)
    backgroundSyncService.forceSyncStudent(studentId).catch(error => {
      console.error('Background sync failed (non-critical):', error);
    });

    return NextResponse.json({
      success: true,
      files,
      count: files.length,
      totalCount: allFiles.length,
      hasMore,
      fromCache: false,
      studentName,
      idType: resolvedIdType,
    });

  } catch (error) {
    console.error('❌ Error listing files:', error);
    return NextResponse.json(
      createErrorResponse(handleUnknownError(error)),
      { status: 500 }
    );
  }
}
