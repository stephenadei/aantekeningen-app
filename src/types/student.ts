/**
 * Student and Teacher related types
 */

import type {
  FirestoreStudentId,
  DriveFolderId,
  TeacherId,
  Email,
  TeacherEmail,
  Pin,
  PinHash,
  IPAddress,
  UserAgent,
  StudentName,
  TeacherName,
  Subject,
} from '@/lib/types';

export interface Teacher {
  id: TeacherId;
  email: TeacherEmail;
  name: TeacherName;
  createdAt: string;
  lastLoginAt?: string;
  isActive: boolean;
}

export interface Student {
  id: FirestoreStudentId;
  displayName: StudentName;
  email?: Email;
  pinHash: PinHash;
  driveFolderId?: DriveFolderId;
  datalakePath?: string | null;
  subject?: Subject;
  createdAt: string;
  lastLoginAt?: string;
  isActive: boolean;
  tags?: StudentTag[];
}

export interface StudentTag {
  id: string;
  studentId: FirestoreStudentId;
  tag: string;
  color?: string;
  createdAt: string;
}

export interface UnlinkedFolder {
  id: string;
  driveFolderId: DriveFolderId;
  folderName: string;
  studentName?: StudentName;
  subject?: Subject;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
  confirmedAt?: string;
  confirmedBy?: TeacherId;
}

export interface LoginAudit {
  id: string;
  studentId?: FirestoreStudentId;
  teacherId?: TeacherId;
  teacher?: { name: string; email: string };
  student?: { name: string; email: string };
  who?: string;
  action?: string;
  ipAddress: IPAddress;
  userAgent: UserAgent;
  success: boolean;
  failureReason?: string;
  createdAt: string;
}

export interface CreateTeacherInput {
  email: TeacherEmail;
  name: TeacherName;
}

export interface CreateStudentInput {
  displayName: StudentName;
  email?: Email;
  pin: Pin;
  driveFolderId?: DriveFolderId;
  subject?: Subject;
}

export interface CreateStudentTagInput {
  studentId: FirestoreStudentId;
  tag: string;
  color?: string;
}

export interface CreateUnlinkedFolderInput {
  driveFolderId: DriveFolderId;
  folderName: string;
  studentName?: StudentName;
  subject?: Subject;
}

export interface CreateLoginAuditInput {
  who: string;
  action: string;
  ip: IPAddress | null;
  userAgent: UserAgent | null;
  metadata: Record<string, unknown> | null;
}

export interface AdminStudentWithMetadata extends Omit<Student, 'lastLoginAt'> {
  fileCount: number;
  lastActivity: string | null;
  lastLoginAt: string | null;
}

