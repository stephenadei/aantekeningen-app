/**
 * Datalake client that reads from Platform API (S3 gold/silver behind API).
 * Use when PLATFORM_API_URL and PLATFORM_API_KEY are set; avoids direct S3 in the app.
 */

const BASE_URL = process.env.PLATFORM_API_URL?.replace(/\/$/, '') || '';
const API_KEY = process.env.PLATFORM_API_KEY || process.env.PLATFORM_API_KEYS?.split(',')[0]?.trim() || '';

export function isPlatformApiConfigured(): boolean {
  return Boolean(BASE_URL && API_KEY);
}

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  };
}

export interface DatalakeStudent {
  name: string;
  id: string;
  path: string;
  subject?: string;
  fileCount?: number;
}

export interface DatalakeFile {
  name: string;
  path: string;
  size?: number;
  modifiedTime?: string;
  downloadUrl?: string;
}

/**
 * List students from silver layer via Platform API.
 */
export async function listStudents(search?: string): Promise<DatalakeStudent[]> {
  const url = search
    ? `${BASE_URL}/api/datalake/students?search=${encodeURIComponent(search)}`
    : `${BASE_URL}/api/datalake/students`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    throw new Error(`Platform API students: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { success?: boolean; data?: DatalakeStudent[] };
  if (!json.success || !Array.isArray(json.data)) {
    return [];
  }
  return json.data;
}

/**
 * List files (notes) for a student by name via Platform API.
 */
export async function getStudentFiles(studentName: string): Promise<DatalakeFile[]> {
  const url = `${BASE_URL}/api/datalake/students/${encodeURIComponent(studentName)}/files`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Platform API student files: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { success?: boolean; data?: { files?: DatalakeFile[] } };
  if (!json.success || !json.data?.files) {
    return [];
  }
  return json.data.files;
}

/**
 * Get presigned download URL for a file path via Platform API.
 */
export async function getFileDownloadUrl(path: string, expiresIn = 3600): Promise<string> {
  const url = `${BASE_URL}/api/datalake/files/${encodeURIComponent(path)}/download?expiresIn=${expiresIn}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    throw new Error(`Platform API download URL: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { success?: boolean; data?: { downloadUrl?: string } };
  if (!json.success || !json.data?.downloadUrl) {
    throw new Error('Platform API did not return download URL');
  }
  return json.data.downloadUrl;
}

/**
 * Get file metadata via Platform API.
 */
export async function getFileMetadata(path: string): Promise<{
  name: string;
  path: string;
  size?: number;
  modifiedTime?: string;
  mimeType?: string;
  metadata?: Record<string, string>;
}> {
  const url = `${BASE_URL}/api/datalake/files/${encodeURIComponent(path)}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`File not found: ${path}`);
    }
    throw new Error(`Platform API file metadata: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { success?: boolean; data?: Record<string, unknown> };
  if (!json.success || !json.data) {
    throw new Error('Platform API did not return file metadata');
  }
  return json.data as ReturnType<typeof getFileMetadata> extends Promise<infer R> ? R : never;
}
