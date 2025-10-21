import { db } from './firebase-admin';
import { DocumentSnapshot, DocumentData } from 'firebase-admin/firestore';
import { 
  createFirestoreStudentId,
  createDriveFolderId
} from './types';
import type { DriveCache, FileMetadata } from './interfaces';
import type { CacheType } from './types';

// Cache configuration
const CACHE_DURATION_HOURS = parseInt(process.env.CACHE_DURATION_HOURS || '12');

// Cache types are now imported from interfaces.ts

// Firestore cache schema
// DriveCache interface is now imported from ./interfaces

// File metadata schema for optimized queries
// FileMetadata interface is now imported from ./interfaces

/**
 * Get cached data from Firestore
 */
export async function getCachedData(
  cacheKey: string
): Promise<Record<string, unknown> | null> {
  try {
    const doc = await db.collection('driveCache').doc(cacheKey).get();
    
    if (!doc.exists) {
      console.log(`Cache miss: ${cacheKey}`);
      return null;
    }

    const cacheData = doc.data() as DriveCache;
    const now = new Date();
    const expiresAt = new Date(cacheData.expiresAt);

    // Check if cache is expired
    if (now > expiresAt) {
      console.log(`Cache expired: ${cacheKey}`);
      // Delete expired cache entry
      await db.collection('driveCache').doc(cacheKey).delete();
      return null;
    }

    console.log(`Cache hit: ${cacheKey}`);
    return cacheData.data;
  } catch (error) {
    console.error(`Error getting cache for ${cacheKey}:`, error);
    return null;
  }
}

/**
 * Set cached data in Firestore
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
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (ttlHours * 60 * 60 * 1000));

    const cacheEntry: DriveCache = {
      id: cacheKey,
      type,
      data,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      studentId: studentId ? createFirestoreStudentId(studentId) : undefined,
      folderId: folderId ? createDriveFolderId(folderId) : undefined,
      lastModified: lastModified ? lastModified.toISOString() : undefined,
    };

    await db.collection('driveCache').doc(cacheKey).set(cacheEntry);
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
 * Get file metadata from optimized collection
 */
export async function getFileMetadata(studentId: string): Promise<FileMetadata[]> {
  try {
    if (!db) {
      console.error('❌ Firestore database not initialized');
      return [];
    }
    
    // Try the full query first, fall back to simple query if index is still building
    let snapshot: DocumentSnapshot<DocumentData>[];
    try {
      const querySnapshot = await db.collection('fileMetadata')
        .where('studentId', '==', studentId)
        .orderBy('modifiedTime', 'desc')
        .get();
      snapshot = querySnapshot.docs;
    } catch (error) {
      const firebaseError = error as { code?: number };
      if (firebaseError.code === 9) {
        console.log('🔄 Index still building, using simple query...');
        // Fall back to simple query without orderBy
        const querySnapshot = await db.collection('fileMetadata')
          .where('studentId', '==', studentId)
          .get();
        
        // Sort manually in JavaScript
        const docs = querySnapshot.docs.sort((a, b) => {
          const aTime = a.data().modifiedTime?.toDate?.() || new Date(0);
          const bTime = b.data().modifiedTime?.toDate?.() || new Date(0);
          return bTime.getTime() - aTime.getTime();
        });
        
        snapshot = docs;
      } else {
        throw error;
      }
    }

    const docs = snapshot;
    return docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FileMetadata));
  } catch (error) {
    console.error(`Error getting file metadata for student ${studentId}:`, error);
    return [];
  }
}

/**
 * Set file metadata in optimized collection
 */
export async function setFileMetadata(files: FileMetadata[]): Promise<void> {
  try {
    const batch = db.batch();
    
    for (const file of files) {
      const docRef = db.collection('fileMetadata').doc(file.id);
      batch.set(docRef, {
        ...file,
        aiAnalyzedAt: file.aiAnalyzedAt || null, // Convert undefined to null
        updatedAt: new Date().toISOString(),
      });
    }

    await batch.commit();
    console.log(`Updated ${files.length} file metadata entries`);
  } catch (error) {
    console.error('Error setting file metadata:', error);
  }
}

/**
 * Invalidate cache entries matching a pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    // Invalidate drive cache
    const driveSnapshot = await db.collection('driveCache')
      .where('id', '>=', pattern)
      .where('id', '<=', pattern + '\uf8ff')
      .get();

    const driveBatch = db.batch();
    driveSnapshot.docs.forEach(doc => {
      driveBatch.delete(doc.ref);
    });

    if (driveSnapshot.docs.length > 0) {
      await driveBatch.commit();
      console.log(`Invalidated ${driveSnapshot.docs.length} drive cache entries matching ${pattern}`);
    }

    // Invalidate file metadata cache if pattern matches
    if (pattern === 'ai-analysis' || pattern.startsWith('student-')) {
      const fileMetadataSnapshot = await db.collection('fileMetadata')
        .get();

      const metadataBatch = db.batch();
      let invalidatedCount = 0;

      fileMetadataSnapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // For 'ai-analysis' pattern, invalidate all files
        if (pattern === 'ai-analysis') {
          metadataBatch.update(doc.ref, {
            aiAnalyzedAt: null,
            updatedAt: new Date().toISOString(),
          });
          invalidatedCount++;
        }
        // For 'student-X' pattern, invalidate files for that student
        else if (pattern.startsWith('student-') && data.studentId === pattern.replace('student-', '')) {
          metadataBatch.update(doc.ref, {
            aiAnalyzedAt: null,
            updatedAt: new Date().toISOString(),
          });
          invalidatedCount++;
        }
      });

      if (invalidatedCount > 0) {
        await metadataBatch.commit();
        console.log(`Invalidated AI analysis for ${invalidatedCount} file metadata entries`);
      }
    }

  } catch (error) {
    console.error(`Error invalidating cache for pattern ${pattern}:`, error);
  }
}

/**
 * Clean up expired cache entries
 */
export async function cleanupExpiredCache(): Promise<void> {
  try {
    const now = new Date().toISOString();
    const snapshot = await db.collection('driveCache')
      .where('expiresAt', '<', now)
      .limit(100) // Process in batches
      .get();

    if (snapshot.empty) {
      console.log('No expired cache entries found');
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Cleaned up ${snapshot.docs.length} expired cache entries`);
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
    const [allSnapshot, expiredSnapshot] = await Promise.all([
      db.collection('driveCache').get(),
      db.collection('driveCache').where('expiresAt', '<', new Date().toISOString()).get()
    ]);

    const byType: Record<string, number> = {};
    allSnapshot.docs.forEach(doc => {
      const data = doc.data() as DriveCache;
      byType[data.type] = (byType[data.type] || 0) + 1;
    });

    return {
      totalEntries: allSnapshot.docs.length,
      expiredEntries: expiredSnapshot.docs.length,
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
 */
export async function isFileMetadataFresh(
  studentId: string, 
  maxAgeHours: number = 6
): Promise<boolean> {
  try {
    const snapshot = await db.collection('fileMetadata')
      .where('studentId', '==', studentId)
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return false;
    }

    const latestUpdate = new Date(snapshot.docs[0].data().updatedAt);
    const now = new Date();
    const ageHours = (now.getTime() - latestUpdate.getTime()) / (1000 * 60 * 60);

    return ageHours < maxAgeHours;
  } catch (error) {
    console.error(`Error checking file metadata freshness for ${studentId}:`, error);
    return false;
  }
}
