/**
 * Cache related types
 */

import type {
  FirestoreStudentId,
  DriveFolderId,
} from '@/lib/types';

export interface DriveCache {
  id: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: string | Date;
  expiresAt: string | Date;
  studentId?: FirestoreStudentId;
  folderId?: DriveFolderId;
  lastModified?: string | Date;
}

export interface CacheStats {
  totalEntries: number;
  expiredEntries: number;
  byType: Record<string, number>;
}

