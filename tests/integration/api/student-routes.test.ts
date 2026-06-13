import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { Ok, Err } from '@/lib/types';

// Integration coverage for the files + overview routes after the resolution
// seam (Module A/B) extraction. Deps are mocked so we exercise the route's
// outcome mapping (resolved / no-files / no-notes / not-found / invalid)
// without S3 or a database. idType hints keep branches deterministic.

const getStudent = vi.fn();
const getStudentByDriveFolderId = vi.fn();
const validateFirestoreStudentId = vi.fn(async (id: string) => Ok(id));
const validateDriveFolderId = vi.fn(async (id: string) => Ok(id));
const getStudentPath = vi.fn(async () => null as string | null);
const listFilesInFolder = vi.fn(async () => [] as Array<{ id: string; name: string }>);
const getStudentOverview = vi.fn(async () => ({ fileCount: 0 }));
const findUnique = vi.fn(async () => null as { name: string; datalakePath: string | null } | null);

vi.mock('@/lib/database', async () => {
  const actual = await vi.importActual<typeof import('@/lib/database')>('@/lib/database');
  return { ...actual, getStudent, getStudentByDriveFolderId, validateFirestoreStudentId, validateDriveFolderId };
});

vi.mock('@/lib/datalake-simple', () => ({
  datalakeService: { getStudentPath, listFilesInFolder, getStudentOverview, getAllStudentFolders: vi.fn(async () => []) },
}));

vi.mock('@/lib/cache', () => ({
  getFileMetadata: vi.fn(async () => []),
  isFileMetadataFresh: vi.fn(async () => true),
}));

vi.mock('@/lib/background-sync', () => ({
  backgroundSyncService: { forceSyncStudent: vi.fn(async () => undefined) },
}));

vi.mock('@stephenadei/database', () => ({
  prisma: { student: { findUnique } },
}));

const req = (path: string, query = '') =>
  new NextRequest(`http://localhost:3000/api/students/${path}${query}`);

describe('GET /api/students/files/[...id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStudentByDriveFolderId.mockResolvedValue(Err(new Error('nf')));
    validateFirestoreStudentId.mockImplementation(async (id: string) => Ok(id));
    validateDriveFolderId.mockImplementation(async (id: string) => Ok(id));
    getStudentPath.mockResolvedValue(null);
    listFilesInFolder.mockResolvedValue([]);
    findUnique.mockResolvedValue(null);
  });

  it('firestore id with a stored datalakePath returns the files (200)', async () => {
    getStudent.mockResolvedValue(Ok({ displayName: 'Teresa', datalakePath: 'notability/Priveles/VO/Teresa' }));
    listFilesInFolder.mockResolvedValue([{ id: 'f1', name: 'a.pdf' }]);
    const { GET } = await import('@/app/api/students/files/[...id]/route');
    const res = await GET(req('stud-1/files', '?idType=firestore'), { params: Promise.resolve({ id: ['stud-1'] }) });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.files).toHaveLength(1);
    expect(data.studentName).toBe('Teresa');
  });

  it('firestore student with no datalake location returns empty (200, no-files)', async () => {
    getStudent.mockResolvedValue(Ok({ displayName: 'Ghost' }));
    const { GET } = await import('@/app/api/students/files/[...id]/route');
    const res = await GET(req('stud-2/files', '?idType=firestore'), { params: Promise.resolve({ id: ['stud-2'] }) });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.files).toEqual([]);
    expect(data.studentName).toBe('Ghost');
    expect(data.hasMore).toBe(false);
  });

  it('firestore student not found returns 404', async () => {
    getStudent.mockResolvedValue(Err(new Error('Student not found')));
    const { GET } = await import('@/app/api/students/files/[...id]/route');
    const res = await GET(req('missing/files', '?idType=firestore'), { params: Promise.resolve({ id: ['missing'] }) });
    expect(res.status).toBe(404);
  });

  it('an invalid firestore id returns 400', async () => {
    validateFirestoreStudentId.mockResolvedValue(Err(new Error('bad id')));
    const { GET } = await import('@/app/api/students/files/[...id]/route');
    const res = await GET(req('%%%/files', '?idType=firestore'), { params: Promise.resolve({ id: ['%%%'] }) });
    expect(res.status).toBe(400);
  });

  it('a Prisma id with no datalakePath reports "no notes yet" (200, no-notes)', async () => {
    findUnique.mockResolvedValue({ name: 'Lola', datalakePath: null });
    const { GET } = await import('@/app/api/students/files/[...id]/route');
    const res = await GET(req('clx0123456789abcdefghij/files'), { params: Promise.resolve({ id: ['clx0123456789abcdefghij'] }) });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.hasNotes).toBe(false);
    expect(data.studentName).toBe('Lola');
  });
});

describe('GET /api/students/overview/[...id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStudentByDriveFolderId.mockResolvedValue(Err(new Error('nf')));
    validateFirestoreStudentId.mockImplementation(async (id: string) => Ok(id));
    getStudentPath.mockResolvedValue(null);
    getStudentOverview.mockResolvedValue({ fileCount: 3 });
  });

  it('firestore id with a stored datalakePath returns an overview (200)', async () => {
    getStudent.mockResolvedValue(Ok({ displayName: 'Noor', datalakePath: 'notability/Priveles/VO/Noor' }));
    const { GET } = await import('@/app/api/students/overview/[...id]/route');
    const res = await GET(req('stud-9/overview', '?idType=firestore'), { params: Promise.resolve({ id: ['stud-9'] }) });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.overview).toEqual({ fileCount: 3 });
    expect(data.studentName).toBe('Noor');
  });

  it('firestore student with no location returns an empty overview (200)', async () => {
    getStudent.mockResolvedValue(Ok({ displayName: 'Empty' }));
    const { GET } = await import('@/app/api/students/overview/[...id]/route');
    const res = await GET(req('stud-10/overview', '?idType=firestore'), { params: Promise.resolve({ id: ['stud-10'] }) });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.overview.fileCount).toBe(0);
    expect(data.studentName).toBe('Empty');
  });

  it('firestore student not found returns 404', async () => {
    getStudent.mockResolvedValue(Err(new Error('Student not found')));
    const { GET } = await import('@/app/api/students/overview/[...id]/route');
    const res = await GET(req('missing/overview', '?idType=firestore'), { params: Promise.resolve({ id: ['missing'] }) });
    expect(res.status).toBe(404);
  });
});
