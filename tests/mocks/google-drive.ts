import { vi } from 'vitest';
import type {
  DriveFolderId,
  StudentName,
  Subject,
  DriveUrl,
  DriveFileId,
  FileName,
  CleanFileName,
  DownloadUrl,
  ViewUrl,
  ThumbnailUrl,
  TopicGroup,
  Topic,
  Level,
  SchoolYear
} from '@/lib/types';
import type { FileInfo, StudentOverview } from '@/lib/interfaces';

export interface MockStudent {
  id: DriveFolderId;
  name: StudentName;
  subject: Subject;
  url: DriveUrl;
}

export type MockFileInfo = FileInfo;

export type MockStudentOverview = StudentOverview;

export const mockGoogleDriveService = {
  getStudents: vi.fn().mockResolvedValue([
    {
      id: '1UcSaOYeR7rqZRLdfeotLbwAoAG7uU9DD' as DriveFolderId,
      name: 'Test Student 1' as StudentName,
      subject: 'wiskunde-a' as Subject,
      url: 'https://drive.google.com/drive/folders/1UcSaOYeR7rqZRLdfeotLbwAoAG7uU9DD' as DriveUrl,
    } as MockStudent,
  ]),

  getFilesInFolder: vi.fn().mockResolvedValue([
    {
      id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' as DriveFileId,
      name: 'test-file-1.pdf' as FileName,
      title: 'Test File 1' as CleanFileName,
      url: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view' as DriveUrl,
      downloadUrl: 'https://drive.google.com/uc?export=download&id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' as DownloadUrl,
      viewUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view' as ViewUrl,
      thumbnailUrl: 'https://drive.google.com/thumbnail?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms&sz=w400-h400' as ThumbnailUrl,
      modifiedTime: new Date().toISOString(),
      size: 1024,
      mimeType: 'application/pdf',
      subject: 'wiskunde-a' as Subject,
      topicGroup: 'algebra' as TopicGroup,
      topic: 'lineaire-vergelijkingen' as Topic,
      level: 'havo-4' as Level,
      schoolYear: '2023-2024' as SchoolYear,
      keywords: ['algebra', 'vergelijkingen', 'lineair'],
      summary: 'Test document about linear equations',
      summaryEn: 'Test document about linear equations',
      topicEn: 'linear-equations',
      keywordsEn: ['algebra', 'equations', 'linear'],
      skills: ['problem-solving', 'algebraic-manipulation'],
      tools: ['calculator', 'graph-paper'],
      theme: 'mathematics',
      aiAnalyzedAt: new Date(),
    } as MockFileInfo,
  ]),

  getFileMetadata: vi.fn().mockResolvedValue({
    id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' as DriveFileId,
    name: 'test-file.pdf' as FileName,
    title: 'Test File' as CleanFileName,
    url: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view' as DriveUrl,
    downloadUrl: 'https://drive.google.com/uc?export=download&id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' as DownloadUrl,
    viewUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view' as ViewUrl,
    thumbnailUrl: 'https://drive.google.com/thumbnail?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms&sz=w400-h400' as ThumbnailUrl,
    modifiedTime: new Date().toISOString(),
    size: 1024,
    mimeType: 'application/pdf',
    subject: 'wiskunde-a' as Subject,
    topicGroup: 'algebra' as TopicGroup,
    topic: 'lineaire-vergelijkingen' as Topic,
    level: 'havo-4' as Level,
    schoolYear: '2023-2024' as SchoolYear,
    keywords: ['algebra', 'vergelijkingen', 'lineair'],
    summary: 'Test document about linear equations',
    summaryEn: 'Test document about linear equations',
    topicEn: 'linear-equations',
    keywordsEn: ['algebra', 'equations', 'linear'],
    skills: ['problem-solving', 'algebraic-manipulation'],
    tools: ['calculator', 'graph-paper'],
    theme: 'mathematics',
    aiAnalyzedAt: new Date(),
  } as MockFileInfo),

  getStudentOverview: vi.fn().mockResolvedValue({
    fileCount: 5,
    lastActivity: 'file uploaded',
    lastActivityDate: new Date().toISOString(),
    lastFile: {
      id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' as DriveFileId,
      name: 'test-file.pdf' as FileName,
      title: 'Test File' as CleanFileName,
      subject: 'wiskunde-a' as Subject,
      topicGroup: 'algebra' as TopicGroup,
      topic: 'lineaire-vergelijkingen' as Topic,
      summary: 'Summary of algebra concepts',
      modifiedTime: new Date().toISOString(),
    },
  } as MockStudentOverview),

  analyzeFileWithAI: vi.fn().mockResolvedValue({
    subject: 'wiskunde-a' as Subject,
    topicGroup: 'algebra' as TopicGroup,
    topic: 'lineaire-vergelijkingen' as Topic,
    level: 'havo-4' as Level,
    schoolYear: '2023-2024' as SchoolYear,
    keywords: ['algebra', 'vergelijkingen', 'lineair'],
    summary: 'This document covers basic algebra concepts',
    summaryEn: 'This document covers basic algebra concepts',
    topicEn: 'linear-equations',
    keywordsEn: ['algebra', 'equations', 'linear'],
    skills: ['problem-solving', 'algebraic-manipulation'],
    tools: ['calculator', 'graph-paper'],
    theme: 'mathematics',
  }),

  searchFiles: vi.fn().mockResolvedValue([
    {
      id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' as DriveFileId,
      name: 'test-file.pdf' as FileName,
      title: 'Test File' as CleanFileName,
      url: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view' as DriveUrl,
      downloadUrl: 'https://drive.google.com/uc?export=download&id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' as DownloadUrl,
      viewUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view' as ViewUrl,
      thumbnailUrl: 'https://drive.google.com/thumbnail?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms&sz=w400-h400' as ThumbnailUrl,
      modifiedTime: new Date().toISOString(),
      size: 1024,
      mimeType: 'application/pdf',
      subject: 'wiskunde-a' as Subject,
      topicGroup: 'algebra' as TopicGroup,
      topic: 'lineaire-vergelijkingen' as Topic,
      level: 'havo-4' as Level,
      schoolYear: '2023-2024' as SchoolYear,
      keywords: ['algebra', 'vergelijkingen', 'lineair'],
      summary: 'Test document about linear equations',
      summaryEn: 'Test document about linear equations',
      topicEn: 'linear-equations',
      keywordsEn: ['algebra', 'equations', 'linear'],
      skills: ['problem-solving', 'algebraic-manipulation'],
      tools: ['calculator', 'graph-paper'],
      theme: 'mathematics',
      aiAnalyzedAt: new Date(),
    } as MockFileInfo,
  ]),

  syncStudentFiles: vi.fn().mockResolvedValue({
    newFiles: 1,
    updatedFiles: 0,
    totalFiles: 5,
  }),

  getFolderStructure: vi.fn().mockResolvedValue({
    id: 'folder-1',
    name: 'Student Folder',
    files: [],
    subfolders: [],
  }),

  downloadFile: vi.fn().mockResolvedValue(Buffer.from('file content')),
};

export const googleDriveService = mockGoogleDriveService;

const mockGoogleDrive = {
  googleDriveService: mockGoogleDriveService,
};

export default mockGoogleDrive;
