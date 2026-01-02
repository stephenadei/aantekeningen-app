/**
 * File and Note related types
 */

import type {
  NoteId,
  KeyConceptId,
  DriveFileId,
  FileName,
  CleanFileName,
  Subject,
  TopicGroup,
  Topic,
  Level,
  SchoolYear,
  DriveUrl,
  DownloadUrl,
  ViewUrl,
  ThumbnailUrl,
  FirestoreStudentId,
  DriveFolderId,
} from '@/lib/types';

export type NoteType = 'TEXT' | 'PDF' | 'MARKDOWN' | 'AUDIO' | 'IMAGE' | 'LINK';
export type NoteStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';

export interface PrismaNote {
  id: string;
  studentId: string;
  lessonId?: string | null;
  authorId?: string | null;
  userId?: string | null;
  type: NoteType;
  title?: string | null;
  body?: string | null;
  content?: string | null;
  datalakePath?: string | null;
  subject?: string | null;
  topicGroup?: string | null;
  topic?: string | null;
  level?: string | null;
  schoolYear?: string | null;
  keywords: string[];
  status: NoteStatus;
  tags: string[];
  isPrivate: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  lessonDate?: string | Date | null;
}

export interface FirestoreNote {
  id: NoteId;
  studentId: FirestoreStudentId;
  driveFileId: DriveFileId;
  fileName: FileName;
  title: CleanFileName;
  subject?: Subject;
  topicGroup?: string;
  topic?: Topic;
  level?: Level;
  schoolYear?: SchoolYear;
  keywords?: string[];
  summary?: string;
  summaryEn?: string;
  topicEn?: string;
  keywordsEn?: string[];
  skills?: string[];
  tools?: string[];
  theme?: string;
  createdAt: string;
  updatedAt: string;
  aiAnalyzedAt?: string;
}

export interface Note {
  id: string;
  studentId: string;
  // Note fields
  driveFileId?: DriveFileId;
  fileName?: FileName;
  title?: CleanFileName;
  subject?: Subject;
  topicGroup?: string;
  topic?: Topic;
  level?: Level;
  schoolYear?: SchoolYear;
  keywords?: string[];
  summary?: string;
  summaryEn?: string;
  topicEn?: string;
  keywordsEn?: string[];
  skills?: string[];
  tools?: string[];
  theme?: string;
  aiAnalyzedAt?: string;
  // PrismaNote fields
  lessonId?: string | null;
  authorId?: string | null;
  userId?: string | null;
  type?: NoteType;
  body?: string | null;
  content?: string | null;
  datalakePath?: string | null;
  status?: NoteStatus;
  tags?: string[];
  isPrivate?: boolean;
  lessonDate?: string | Date | null;
  // Common timestamp fields (accept both string and Date)
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface KeyConcept {
  id: KeyConceptId;
  noteId: NoteId;
  concept: string;
  definition: string;
  examples?: string[];
  importance: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface DriveStudent {
  id: DriveFolderId;
  name: string;
  subject: Subject;
  url: DriveUrl;
}

export interface FileInfo {
  id: DriveFileId;
  name: FileName;
  title: CleanFileName;
  url?: DriveUrl;
  downloadUrl?: DownloadUrl;
  viewUrl?: ViewUrl;
  thumbnailUrl?: ThumbnailUrl;
  modifiedTime: string;
  size?: number;
  mimeType?: string;
  // Date extracted from title/filename (e.g., "15 Oct 2025" from "Priveles 15 Oct 2025 15_52_52")
  // Can be Date object or ISO string (when serialized from cache/API)
  dateFromTitle?: Date | string | null;
  // PDF creation date extracted from PDF metadata (if available)
  // Can be Date object or ISO string (when serialized from cache/API)
  pdfCreationDate?: Date | string | null;
  // AI-generated metadata
  subject?: Subject;
  topicGroup?: TopicGroup;
  topic?: Topic;
  level?: Level;
  schoolYear?: SchoolYear;
  keywords?: string[];
  summary?: string;
  summaryEn?: string;
  topicEn?: string;
  keywordsEn?: string[];
  skills?: string[];
  tools?: string[];
  theme?: string;
  aiAnalyzedAt?: Date;
}

export interface StudentOverview {
  fileCount: number;
  lastActivity: string | null;
  lastActivityDate: string;
  lastFile?: {
    id: DriveFileId;
    name: FileName;
    title: CleanFileName;
    subject?: Subject;
    topicGroup?: string;
    topic?: Topic;
    summary?: string;
    modifiedTime: string;
  };
}

export interface FileMetadata {
  id: DriveFileId;
  studentId: FirestoreStudentId;
  folderId: DriveFolderId;
  name: FileName;
  title: CleanFileName;
  modifiedTime: string;
  size: number;
  thumbnailUrl: ThumbnailUrl;
  downloadUrl: DownloadUrl;
  viewUrl: ViewUrl;
  subject?: Subject;
  topic?: Topic;
  level?: Level;
  schoolYear?: SchoolYear;
  keywords?: string[];
  summary?: string;
  summaryEn?: string;
  topicEn?: string;
  keywordsEn?: string[];
  aiAnalyzedAt?: string;
  createdAt: string;
  updatedAt: string;
  checksum?: string;
}

export interface CreateNoteInput {
  studentId: FirestoreStudentId;
  driveFileId: DriveFileId;
  fileName: FileName;
  title: CleanFileName;
  subject?: Subject;
  topicGroup?: string;
  topic?: Topic;
  level?: Level;
  schoolYear?: SchoolYear;
  keywords?: string[];
  summary?: string;
  summaryEn?: string;
  topicEn?: string;
  keywordsEn?: string[];
  skills?: string[];
  tools?: string[];
  theme?: string;
}

export interface CreateKeyConceptInput {
  noteId: NoteId;
  concept: string;
  definition: string;
  examples?: string[];
  importance: 'low' | 'medium' | 'high';
}

export interface ApiFileInfo {
  id: string;
  name: string;
  title: string;
  url: string;
  downloadUrl: string;
  viewUrl: string;
  thumbnailUrl: string;
  modifiedTime: string;
  size: number;
  subject?: string;
  topicGroup?: string;
  topic?: string;
  level?: string;
  schoolYear?: string;
  keywords?: string[];
  summary?: string;
  summaryEn?: string;
  topicEn?: string;
  keywordsEn?: string[];
}

export interface MainPageStudent {
  id: string;
  displayName: string;
  subject: string;
  url: string;
  hasNotes?: boolean;
  hasAppointments?: boolean;
}

export interface MainPageStudentOverview {
  fileCount: number;
  lastActivity: string | null;
  lastActivityDate: string;
  lastFile?: {
    id: string;
    name: string;
    title: string;
    subject?: string;
    topic?: string;
    summary?: string;
    modifiedTime: string;
  };
}

export interface StudentPageStudent {
  id: string;
  displayName: string;
  subject: string;
  driveFolderId: string;
  url?: string;
}

export interface StudentPageStudentOverview {
  fileCount: number;
  lastActivity: string | null;
  lastActivityDate: string;
  lastFile?: {
    id: string;
    name: string;
    title: string;
    subject?: string;
    topicGroup?: string;
    topic?: string;
    summary?: string;
    modifiedTime: string;
  };
}

export interface StudentPortalStudent {
  id: string;
  displayName: string;
  notes: Array<{
    id: string;
    contentMd: string;
    subject: string;
    level: string;
    topic: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface AdminNoteWithMetadata {
  id: string;
  name: string;
  title: string;
  modifiedTime: string;
  size: number;
  thumbnailUrl: string;
  downloadUrl: string;
  viewUrl: string;
  subject?: Subject | string | undefined;
  topicGroup?: TopicGroup | string | undefined;
  topic?: Topic | string | undefined;
  level?: Level | string | undefined;
  schoolYear?: SchoolYear | string | undefined;
  keywords: string[];
  summary?: string | undefined;
  aiAnalyzedAt?: string | undefined;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    displayName: string;
    subject?: string;
  };
}

