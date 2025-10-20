import { vi } from 'vitest';

export interface MockStudent {
  id: string;
  name: string;
  subject: string;
  url: string;
}

export interface MockFileInfo {
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
  topic?: string;
  level?: string;
  schoolYear?: string;
  keywords?: string[];
  summary?: string;
  aiAnalyzedAt?: Date;
}

export interface MockStudentOverview {
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

export const mockGoogleDriveService = {
  getStudents: vi.fn().mockResolvedValue([
    {
      id: 'student-1',
      name: 'Test Student 1',
      subject: 'Wiskunde',
      url: 'https://drive.google.com/drive/folders/folder-1',
    } as MockStudent,
  ]),

  getFilesInFolder: vi.fn().mockResolvedValue([
    {
      id: 'file-1',
      name: 'test-file-1',
      title: 'Test File 1',
      url: 'https://drive.google.com/file/d/file-1',
      downloadUrl: 'https://drive.google.com/uc?id=file-1&export=download',
      viewUrl: 'https://drive.google.com/file/d/file-1/view',
      thumbnailUrl: 'https://drive-thirdparty.googleusercontent.com/16/type/application/pdf',
      modifiedTime: new Date().toISOString(),
      size: 1024,
    } as MockFileInfo,
  ]),

  getFileMetadata: vi.fn().mockResolvedValue({
    id: 'file-1',
    name: 'test-file',
    title: 'Test File',
    url: 'https://drive.google.com/file/d/file-1',
    downloadUrl: 'https://drive.google.com/uc?id=file-1&export=download',
    viewUrl: 'https://drive.google.com/file/d/file-1/view',
    thumbnailUrl: 'https://drive-thirdparty.googleusercontent.com/16/type/application/pdf',
    modifiedTime: new Date().toISOString(),
    size: 1024,
  } as MockFileInfo),

  getStudentOverview: vi.fn().mockResolvedValue({
    fileCount: 5,
    lastActivity: 'file uploaded',
    lastActivityDate: new Date().toISOString(),
    lastFile: {
      id: 'file-1',
      name: 'test-file',
      title: 'Test File',
      subject: 'Wiskunde',
      topic: 'Algebra',
      summary: 'Summary of algebra concepts',
      modifiedTime: new Date().toISOString(),
    },
  } as MockStudentOverview),

  analyzeFileWithAI: vi.fn().mockResolvedValue({
    subject: 'Wiskunde',
    topic: 'Algebra',
    level: 'Grade 10',
    schoolYear: '2024',
    keywords: ['algebra', 'equations', 'variables'],
    summary: 'This document covers basic algebra concepts',
    summaryEn: 'This document covers basic algebra concepts',
    topicEn: 'Algebra',
    keywordsEn: ['algebra', 'equations', 'variables'],
  }),

  searchFiles: vi.fn().mockResolvedValue([
    {
      id: 'file-1',
      name: 'test-file',
      title: 'Test File',
      url: 'https://drive.google.com/file/d/file-1',
      downloadUrl: 'https://drive.google.com/uc?id=file-1&export=download',
      viewUrl: 'https://drive.google.com/file/d/file-1/view',
      thumbnailUrl: 'https://drive-thirdparty.googleusercontent.com/16/type/application/pdf',
      modifiedTime: new Date().toISOString(),
      size: 1024,
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

export default {
  googleDriveService: mockGoogleDriveService,
};
