/**
 * API response types
 */

import type { FileInfo } from './file';
import type { LoginAudit } from './student';

export interface StudentApiParams {
  id: string;
  idType?: 'firestore' | 'drive' | 'auto';
}

export interface StudentFilesResponse {
  success: boolean;
  files: FileInfo[];
  count: number;
  totalCount: number;
  hasMore: boolean;
  fromCache?: boolean;
  cacheFresh?: boolean;
}

export interface AuditResponse {
  audits: LoginAudit[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

