import { vi } from 'vitest';

// Mock Google Drive API responses
export const mockDriveFiles = {
  '1UcSaOYeR7rqZRLdfeotLbwAoAG7uU9DD': [
    {
      id: '1O6UaU3MBWt_o0fq_qkGkK2IC0eWzR4Q-',
      name: 'Priveles 8 Oct 2025 12_39_30.pdf',
      mimeType: 'application/pdf',
      modifiedTime: '2025-10-08T12:39:30.000Z',
      size: '1024000',
      webViewLink: 'https://drive.google.com/file/d/1O6UaU3MBWt_o0fq_qkGkK2IC0eWzR4Q-/view',
    },
    {
      id: '1hvVkVwSBtlIB9BgT6sEWAIrwawBnUPYt',
      name: 'Priveles 2 Oct 2025 18_04_59.pdf',
      mimeType: 'application/pdf',
      modifiedTime: '2025-10-02T18:04:59.000Z',
      size: '2048000',
      webViewLink: 'https://drive.google.com/file/d/1hvVkVwSBtlIB9BgT6sEWAIrwawBnUPYt/view',
    },
    {
      id: '1sROmOb4G22q3QwmNdwptpQTVje36ZdoO',
      name: 'bijles toets.pdf',
      mimeType: 'application/pdf',
      modifiedTime: '2025-09-25T16:22:26.000Z',
      size: '1536000',
      webViewLink: 'https://drive.google.com/file/d/1sROmOb4G22q3QwmNdwptpQTVje36ZdoO/view',
    },
  ],
};

export const mockDriveService = {
  files: {
    list: vi.fn(),
    get: vi.fn(),
  },
};

// Mock Google Drive API
vi.mock('googleapis', () => ({
  google: {
    drive: vi.fn(() => mockDriveService),
    auth: {
      OAuth2: vi.fn(() => ({
        setCredentials: vi.fn(),
        getAccessToken: vi.fn(() => Promise.resolve({ token: 'mock-access-token' })),
      })),
    },
  },
}));

// Mock Google Drive helper functions
export const mockGetDriveFiles = vi.fn();
export const mockGetFileMetadata = vi.fn();
export const mockGetStudentOverview = vi.fn();

// Setup default mock implementations
mockGetDriveFiles.mockImplementation((folderId: string) => {
  return Promise.resolve(mockDriveFiles[folderId] || []);
});

mockGetFileMetadata.mockImplementation((fileId: string) => {
  const allFiles = Object.values(mockDriveFiles).flat();
  const file = allFiles.find(f => f.id === fileId);
  return Promise.resolve(file || null);
});

mockGetStudentOverview.mockImplementation((folderId: string) => {
  const files = mockDriveFiles[folderId] || [];
  return Promise.resolve({
    fileCount: files.length,
    lastActivity: files[0]?.modifiedTime || new Date().toISOString(),
    lastActivityDate: '8 okt 2025',
    files: files.map(f => ({
      id: f.id,
      name: f.name,
      cleanedName: f.name.replace(/^Priveles\s+/, 'Les ').replace(/\s+\d{2}_\d{2}_\d{2}\.pdf$/, ''),
      modifiedTime: f.modifiedTime,
      size: f.size,
      webViewLink: f.webViewLink,
    })),
  });
});

export { mockDriveFiles, mockDriveService };
