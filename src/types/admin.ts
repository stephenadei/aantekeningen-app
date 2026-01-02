/**
 * Admin related types
 */

import type { Student } from './student';
import type { FileMetadata } from './file';
import type { Subject, TopicGroup, Topic, Level, SchoolYear } from '@/lib/types';
import type { LoginAudit } from './student';

export interface DashboardStats {
  totalStudents: number;
  totalNotes: number;
  totalFiles: number;
  totalTeachers: number;
  activeStudents: number;
  recentActivity: number;
  unconfirmedFolders?: number;
  lastSync?: string;
}

export interface TeacherStats {
  totalTeachers: number;
  activeTeachers: number;
  recentLogins: number;
  lastActivity: Date | null;
}

export interface DriveDataStats {
  totalStudents: number;
  linkedStudents: number;
  unlinkedFolders: number;
  totalFiles: number;
  lastSync?: string;
}

export interface StatsData {
  totalStudents: number;
  totalNotes: number;
  recentActivity: number;
  activeStudents: number;
  unconfirmedFolders: number;
  unlinkedFolders: number;
  subjectBreakdown: Array<{
    subject: string;
    count: number;
  }>;
  levelBreakdown: Array<{
    level: string;
    count: number;
  }>;
  recentNotes: Array<{
    id: string;
    topic: string;
    student: {
      displayName: string;
    };
    createdAt: string;
  }>;
  monthlyGrowth: Array<{
    month: string;
    students: number;
    notes: number;
  }>;
}

export interface SyncStatus {
  lastSync: string | null;
  isRunning: boolean;
  version: string;
}

export interface AdminSubject {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  sortOrder: number;
}

export interface AdminTopic {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
}

export interface SubjectFormData {
  name: string;
  displayName?: string;
  description: string;
  color: string;
  icon: string;
}

export interface TopicFormData {
  name: string;
  description: string;
}

export interface DriveDataStudent {
  id: string;
  displayName: string;
  driveFolderId: string | null;
  driveFolderName: string | null;
  subject: string | null;
  folderConfirmed: boolean;
  folderLinkedAt: string | null;
  folderConfirmedAt: string | null;
  notes: Array<{
    id: string;
    subject: string;
    level: string;
    topic: string;
    aiGenerated: boolean;
    aiConfirmed: boolean;
    manuallyEdited: boolean;
    createdAt: string;
  }>;
}

export interface DriveDataUnlinkedFolder {
  id: string;
  driveFolderId: string;
  folderName: string;
  subject: string;
  suggestedStudentId: string | null;
  createdAt: string;
}

export interface DriveDataStatsDetailed {
  totalLinkedStudents: number;
  confirmedLinks: number;
  unconfirmedLinks: number;
  unlinkedFolders: number;
  totalFiles: number;
  aiAnalyzedFiles: number;
  pendingAnalysis: number;
  lastSync?: string;
}

export interface FoldersListResponse {
  linkedFolders: Array<{
    student: Student;
    folderId: string;
    folderName: string;
    fileCount: number;
  }>;
  unlinkedFolders: Array<{
    id: string;
    name: string;
    subject?: string;
    suggestedStudentId?: string;
  }>;
  studentsWithoutFolders: Student[];
}

export interface BulkOperationRequest {
  action: 'reanalyze' | 'delete' | 'updateMetadata';
  noteIds: string[];
  metadata?: Partial<FileMetadata>;
}

export interface BulkOperationResponse {
  success: boolean;
  processed: number;
  errors: number;
  errorDetails?: string[];
}

export interface BatchOperation {
  type: 'create' | 'update' | 'delete';
  collection: string;
  docId?: string;
  data?: Record<string, unknown>;
}

