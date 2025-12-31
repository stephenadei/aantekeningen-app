import { datalakeService } from './datalake-simple';
import { datalakeMetadataService, type FileMetadata as DatalakeFileMetadata } from './datalake-metadata';
import { getStudent } from './database';
import { isOk } from './types';
import { 
  createFirestoreStudentId,
  createDriveFolderId
} from './types';
import type { DriveCache, FileMetadata } from './interfaces';
import type { CacheType } from './types';

// Cache configuration
const CACHE_DURATION_HOURS = parseInt(process.env.CACHE_DURATION_HOURS || '12');

// Cache types are now imported from interfaces.ts

// Database cache schema
// DriveCache interface is now imported from ./interfaces

// File metadata schema for optimized queries
// FileMetadata interface is now imported from ./interfaces

// In-memory cache (replaces database cache)
const memoryCacheMap = new Map<string, { data: Record<string, unknown>; expiresAt: number }>();

/**
 * Get cached data from memory cache
 */
export async function getCachedData(
  cacheKey: string
): Promise<Record<string, unknown> | null> {
  try {
    const cached = memoryCacheMap.get(cacheKey);
    
    if (!cached) {
      console.log(`Cache miss: ${cacheKey}`);
      return null;
    }

    const now = Date.now();

    // Check if cache is expired
    if (now > cached.expiresAt) {
      console.log(`Cache expired: ${cacheKey}`);
      memoryCacheMap.delete(cacheKey);
      return null;
    }

    console.log(`Cache hit: ${cacheKey}`);
    return cached.data;
  } catch (error) {
    console.error(`Error getting cache for ${cacheKey}:`, error);
    return null;
  }
}

/**
 * Set cached data in memory cache
 */
export async function setCachedData(
  cacheKey: string,
  type: CacheType,
  data: Record<string, unknown>,
  ttlHours: number = CACHE_DURATION_HOURS,
  studentId?: string,
  folderId?: string,
  lastModified?: Date
): Promise<void> {
  try {
    const now = Date.now();
    const expiresAt = now + (ttlHours * 60 * 60 * 1000);

    memoryCacheMap.set(cacheKey, {
      data,
      expiresAt
    });
    
    console.log(`Cache set: ${cacheKey} (expires in ${ttlHours}h)`);
  } catch (error) {
    console.error(`Error setting cache for ${cacheKey}:`, error);
  }
}

/**
 * Get cached files for a specific folder
 */
export async function getCachedFiles(folderId: string): Promise<Record<string, unknown>[] | null> {
  const cacheKey = `files_${folderId}`;
  const data = await getCachedData(cacheKey);
  return data ? (data as unknown as Record<string, unknown>[]) : null;
}

/**
 * Set cached files for a specific folder
 */
export async function setCachedFiles(
  folderId: string, 
  files: Record<string, unknown>[], 
  ttlHours: number = CACHE_DURATION_HOURS
): Promise<void> {
  const cacheKey = `files_${folderId}`;
  const fileData = files.reduce((acc: Record<string, unknown>, file) => {
    acc[file.id as string] = file;
    return acc;
  }, {});
  await setCachedData(cacheKey, 'files', fileData, ttlHours, undefined, folderId);
}

/**
 * Get file metadata - tries datalake first
 */
export async function getFileMetadata(studentId: string): Promise<FileMetadata[]> {
  try {
    // Try datalake first
    let studentPath: string | null = null;
    let studentName: string | undefined;

    // Check if studentId is a datalake path (contains slashes)
    if (studentId.includes('/')) {
      // It's already a datalake path
      studentPath = studentId;
      const pathParts = studentId.split('/');
      studentName = pathParts[pathParts.length - 2]; // Second to last part
    } else {
      // It's a student ID, try to get student info
      try {
        const studentResult = await getStudent(studentId as any);
        if (isOk(studentResult)) {
          studentName = studentResult.data.displayName;
          // Get datalake path from student name
          studentPath = await datalakeService.getStudentPath(studentName);
        }
      } catch (error) {
        // Fall through - student not found
      }
    }

    // Try to get metadata from datalake
    if (studentPath) {
    try {
        const metadata = await datalakeMetadataService.getStudentFileMetadata(studentPath);
        if (metadata.length > 0) {
          console.log(`✅ Got ${metadata.length} files from datalake for ${studentName || studentId}`);
          // Convert DatalakeFileMetadata to FileMetadata format expected by interfaces
          // Note: This is a simplified conversion - full conversion would require branded types
          return metadata as unknown as FileMetadata[];
        }
    } catch (error) {
        console.log(`⚠️ Failed to get metadata from datalake:`, error);
      }
    }

    // No fallback - datalake is the only source now
    console.log(`⚠️ No metadata found in datalake for ${studentName || studentId}`);
    return [];
  } catch (error) {
    console.error(`Error getting file metadata for student ${studentId}:`, error);
    return [];
  }
}

/**
 * Set file metadata - writes to datalake
 */
export async function setFileMetadata(files: FileMetadata[]): Promise<void> {
  // Write to datalake (primary)
  let datalakeSuccess = 0;
  let datalakeFailed = 0;
    
    for (const file of files) {
    try {
      // file.id contains the full datalake path (e.g., "notability/Priveles/VO/StudentName/file.pdf")
      await datalakeMetadataService.saveFileMetadata(file.id, file);
      datalakeSuccess++;
    } catch (error) {
      console.error(`Error writing metadata to datalake for ${file.id}:`, error);
      datalakeFailed++;
    }
  }

  if (datalakeSuccess > 0) {
    console.log(`✅ Wrote ${datalakeSuccess} file metadata entries to datalake`);
  }
  if (datalakeFailed > 0) {
    console.warn(`⚠️ Failed to write ${datalakeFailed} file metadata entries to datalake`);
  }

  // Database backup removed - datalake is now the only source
  // If you need backup, consider implementing a separate backup service
}

/**
 * Invalidate cache entries matching a pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    // Invalidate memory cache entries matching pattern
      let invalidatedCount = 0;
    for (const [key] of memoryCacheMap.entries()) {
      if (key.includes(pattern) || key.startsWith(pattern)) {
        memoryCacheMap.delete(key);
          invalidatedCount++;
        }
    }

      if (invalidatedCount > 0) {
      console.log(`Invalidated ${invalidatedCount} cache entries matching ${pattern}`);
    }

    // Note: File metadata invalidation is handled by datalake metadata service
    // No database invalidation needed anymore
  } catch (error) {
    console.error(`Error invalidating cache for pattern ${pattern}:`, error);
  }
}

/**
 * Clean up expired cache entries
 */
export async function cleanupExpiredCache(): Promise<void> {
  try {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, value] of memoryCacheMap.entries()) {
      if (now > value.expiresAt) {
        memoryCacheMap.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired cache entries`);
    } else {
      console.log('No expired cache entries found');
    }
  } catch (error) {
    console.error('Error cleaning up expired cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  expiredEntries: number;
  byType: Record<string, number>;
}> {
  try {
    const now = Date.now();
    let expiredCount = 0;
    const byType: Record<string, number> = {};
    
    for (const [key, value] of memoryCacheMap.entries()) {
      // Try to infer type from key
      const type = key.includes('files') ? 'files' : 
                   key.includes('metadata') ? 'metadata' : 
                   key.includes('students') ? 'students' : 
                   'fileMetadata';
      byType[type] = (byType[type] || 0) + 1;
      
      if (now > value.expiresAt) {
        expiredCount++;
      }
    }

    return {
      totalEntries: memoryCacheMap.size,
      expiredEntries: expiredCount,
      byType,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      totalEntries: 0,
      expiredEntries: 0,
      byType: {},
    };
  }
}

/**
 * Check if file metadata is fresh (less than specified hours old)
 * Checks datalake metadata
 */
export async function isFileMetadataFresh(
  studentId: string, 
  maxAgeHours: number = 6
): Promise<boolean> {
  try {
    // Get student name from studentId (could be path or student ID)
    let studentPath: string | null = null;
    let studentName: string | undefined;
    
    if (studentId.includes('/')) {
      studentPath = studentId;
      const pathParts = studentId.split('/');
      studentName = pathParts[pathParts.length - 2];
    } else {
      const studentResult = await getStudent(studentId as any);
      if (isOk(studentResult)) {
        studentName = studentResult.data.displayName;
        studentPath = await datalakeService.getStudentPath(studentName);
      }
    }
    
    if (!studentPath) {
      return false;
    }
    
    // Get metadata from datalake and check most recent update
    const metadata = await datalakeMetadataService.getStudentFileMetadata(studentPath);
    if (metadata.length === 0) {
      return false;
    }

    // Find most recent update
    const mostRecent = metadata.reduce((latest, file) => {
      const fileTime = new Date(file.updatedAt || file.modifiedTime).getTime();
      const latestTime = new Date(latest.updatedAt || latest.modifiedTime).getTime();
      return fileTime > latestTime ? file : latest;
    });
    
    const latestUpdate = new Date(mostRecent.updatedAt || mostRecent.modifiedTime);
    const now = new Date();
    const ageHours = (now.getTime() - latestUpdate.getTime()) / (1000 * 60 * 60);

    return ageHours < maxAgeHours;
  } catch (error) {
    console.error(`Error checking file metadata freshness for ${studentId}:`, error);
    return false;
  }
}
