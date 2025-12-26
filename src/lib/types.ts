/**
 * Comprehensive Type System Architecture
 * 
 * This file defines branded types, result types, and validation utilities
 * to provide compile-time type safety and prevent common bugs throughout
 * the application.
 */

// ============================================================================
// GENERIC UTILITY TYPES
// ============================================================================

/**
 * Generic branded type helper
 * @template T The base type to brand
 * @template Brand The brand identifier
 */
type Branded<T, Brand extends string> = T & { readonly __brand: Brand };

/**
 * Shorthand for branded string types
 * @template Brand The brand identifier
 */
type StringBrand<Brand extends string> = Branded<string, Brand>;

// ============================================================================
// RESULT TYPE PATTERN
// ============================================================================

/**
 * A Result type for explicit error handling without exceptions
 * @template T The success data type
 * @template E The error type (defaults to Error)
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create a successful Result
 */
export function Ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Create a failed Result
 */
export function Err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Type guard to check if a Result is successful
 */
export function isOk<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success;
}

/**
 * Type guard to check if a Result is an error
 */
export function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}

/**
 * Unwrap a Result, throwing if it's an error
 * Use with caution - prefer explicit error handling
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.success) {
    return result.data;
  }
  throw result.error;
}

/**
 * Unwrap a Result with a default value if it's an error
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.success ? result.data : defaultValue;
}

// ============================================================================
// TYPE METADATA REGISTRY
// ============================================================================

/**
 * Registry of all branded types with their validation logic
 */
const TYPE_METADATA = {
  // Identity Types
  FirestoreStudentId: { 
    validate: (v: string) => /^[a-zA-Z0-9]{20}$/.test(v),
    description: 'Firestore student document ID (20 alphanumeric chars)'
  },
  DriveFolderId: { 
    validate: (v: string) => v.length > 20,
    description: 'Google Drive folder ID (longer than 20 chars)'
  },
  TeacherId: { 
    validate: (v: string) => v.length >= 20 && v.length <= 30 && /^[a-zA-Z0-9]+$/.test(v),
    description: 'Firestore teacher document ID or Firebase UID'
  },
  NoteId: { 
    validate: (v: string) => v.length === 20 && /^[a-zA-Z0-9]+$/.test(v),
    description: 'Firestore note document ID'
  },
  KeyConceptId: { 
    validate: (v: string) => v.length === 20 && /^[a-zA-Z0-9]+$/.test(v),
    description: 'Firestore key concept document ID'
  },
  LoginAuditId: { 
    validate: (v: string) => v.length === 20 && /^[a-zA-Z0-9]+$/.test(v),
    description: 'Firestore login audit document ID'
  },
  DriveFileId: { 
    validate: (v: string) => {
      // Accept Google Drive IDs (alphanumeric with underscores/hyphens)
      if (v.length > 20 && /^[a-zA-Z0-9_-]+$/.test(v)) {
        return true;
      }
      // Accept datalake paths (contain slashes, longer paths)
      if (v.includes('/') && v.length > 10) {
        return true;
      }
      return false;
    },
    description: 'Google Drive file ID or Datalake file path'
  },
  SubjectId: { 
    validate: (v: string) => v.length === 20 && /^[a-zA-Z0-9]+$/.test(v),
    description: 'Subject identifier'
  },
  TopicId: { 
    validate: (v: string) => v.length === 20 && /^[a-zA-Z0-9]+$/.test(v),
    description: 'Topic identifier'
  },

  // Authentication & Security Types
  Email: { 
    validate: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    description: 'Valid email address'
  },
  TeacherEmail: { 
    validate: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.endsWith('@stephensprivelessen.nl'),
    description: 'Teacher email ending with @stephensprivelessen.nl'
  },
  Pin: { 
    validate: (v: string) => /^\d{6}$/.test(v),
    description: '6-digit PIN'
  },
  PinHash: { 
    validate: (v: string) => v.startsWith('$2b$') && v.length >= 60,
    description: 'bcrypt hash'
  },
  IPAddress: { 
    validate: (v: string) => {
      // IPv4 regex
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      
      // IPv6 regex - more comprehensive to handle ::1, ::, and other formats
      const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$|^(?:[0-9a-fA-F]{1,4}:)*::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:)*::[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/;
      
      return ipv4Regex.test(v) || ipv6Regex.test(v);
    },
    description: 'Valid IPv4 or IPv6 address'
  },
  UserAgent: { 
    validate: (v: string) => v.length > 0 && v.length <= 1000,
    description: 'User agent string'
  },

  // File System Types
  FileName: { 
    validate: (v: string) => v.length > 0 && v.length <= 255,
    description: 'File name'
  },
  CleanFileName: { 
    validate: (v: string) => v.length > 0 && v.length <= 255 && !/[<>:"/\\|?*]/.test(v),
    description: 'Clean file name without invalid characters'
  },
  FolderName: { 
    validate: (v: string) => v.length > 0 && v.length <= 255,
    description: 'Folder name'
  },

  // Academic Domain Types - validation handled by taxonomy.ts
  SchoolYear: { 
    validate: (v: string) => /^\d{4}-\d{4}$/.test(v),
    description: 'School year in YYYY-YYYY format'
  },

  // URL Types
  DriveUrl: { 
    validate: (v: string) => {
      // Accept Google Drive URLs
      if (v.startsWith('https://drive.google.com/')) {
        return true;
      }
      // Accept datalake paths (start with /)
      if (v.startsWith('/')) {
        return true;
      }
      // Accept presigned MinIO URLs (http/https)
      if (v.startsWith('http://') || v.startsWith('https://')) {
        return true;
      }
      return false;
    },
    description: 'Google Drive URL, Datalake path, or presigned URL'
  },
  DownloadUrl: { 
    validate: (v: string) => {
      // Accept Google Drive download URLs
      if (v.startsWith('https://drive.google.com/uc?export=download')) {
        return true;
      }
      // Accept presigned MinIO URLs (http/https)
      if (v.startsWith('http://') || v.startsWith('https://')) {
        return true;
      }
      return false;
    },
    description: 'Google Drive download URL or presigned MinIO URL'
  },
  ViewUrl: { 
    validate: (v: string) => {
      // Accept Google Drive view URLs
      if (v.startsWith('https://drive.google.com/file/d/')) {
        return true;
      }
      // Accept presigned MinIO URLs (http/https)
      if (v.startsWith('http://') || v.startsWith('https://')) {
        return true;
      }
      return false;
    },
    description: 'Google Drive view URL or presigned MinIO URL'
  },
  ThumbnailUrl: { 
    validate: (v: string) => {
      // Accept Google Drive thumbnail URLs
      if (v.startsWith('https://drive.google.com/thumbnail')) {
        return true;
      }
      // Accept empty string (no thumbnail)
      if (v === '') {
        return true;
      }
      // Accept other URLs
      if (v.startsWith('http://') || v.startsWith('https://')) {
        return true;
      }
      return false;
    },
    description: 'Google Drive thumbnail URL, other URL, or empty string'
  },

  // Display Name Types
  StudentName: { 
    validate: (v: string) => v.length > 0 && v.length <= 100,
    description: 'Student display name'
  },
  TeacherName: { 
    validate: (v: string) => v.length > 0 && v.length <= 100,
    description: 'Teacher display name'
  }
} as const;

// ============================================================================
// BRANDED TYPE DEFINITIONS
// ============================================================================

// Identity Types
export type FirestoreStudentId = StringBrand<'FirestoreStudentId'>;
export type DriveFolderId = StringBrand<'DriveFolderId'>;
export type TeacherId = StringBrand<'TeacherId'>;
export type NoteId = StringBrand<'NoteId'>;
export type KeyConceptId = StringBrand<'KeyConceptId'>;
export type LoginAuditId = StringBrand<'LoginAuditId'>;
export type DriveFileId = StringBrand<'DriveFileId'>;
export type SubjectId = StringBrand<'SubjectId'>;
export type TopicId = StringBrand<'TopicId'>;

// Authentication & Security Types
export type Email = StringBrand<'Email'>;
export type TeacherEmail = Email & { readonly __domain: '@stephensprivelessen.nl' };
export type Pin = StringBrand<'Pin'>;
export type PinHash = StringBrand<'PinHash'>;
export type IPAddress = StringBrand<'IPAddress'>;
export type UserAgent = StringBrand<'UserAgent'>;

// File System Types
export type FileName = StringBrand<'FileName'>;
export type CleanFileName = StringBrand<'CleanFileName'>;
export type FolderName = StringBrand<'FolderName'>;

// Academic Domain Types
// Import literal union types from taxonomy.ts as the source of truth
import type { Subject as TaxonomySubject, Level as TaxonomyLevel, TopicGroup as TaxonomyTopicGroup } from '../data/taxonomy';

// Use the literal union types from taxonomy.ts as the source of truth
export type Subject = TaxonomySubject;
export type Level = TaxonomyLevel;
export type TopicGroup = TaxonomyTopicGroup;
// Topic is just a string - it's validated through the topic group context
export type Topic = string;
export type SchoolYear = StringBrand<'SchoolYear'>;

// URL Types
export type DriveUrl = StringBrand<'DriveUrl'>;
export type DownloadUrl = StringBrand<'DownloadUrl'>;
export type ViewUrl = StringBrand<'ViewUrl'>;
export type ThumbnailUrl = StringBrand<'ThumbnailUrl'>;

// Display Name Types
export type StudentName = StringBrand<'StudentName'>;
export type TeacherName = StringBrand<'TeacherName'>;

// ============================================================================
// GENERIC VALIDATOR AND FACTORY GENERATORS
// ============================================================================

/**
 * Create a type guard function for a branded type
 */
function createValidator<T extends StringBrand<string>>(
  typeName: string,
  validate: (value: string) => boolean
): (value: string) => value is T {
  return (value: string): value is T => validate(value);
}

/**
 * Create a factory function for a branded type
 */
function createFactory<T extends StringBrand<string>>(
  typeName: string,
  validator: (value: string) => value is T
): (value: string) => T {
  return (value: string): T => {
    if (!validator(value)) {
      const metadata = TYPE_METADATA[typeName as keyof typeof TYPE_METADATA];
      const description = metadata?.description || 'valid format';
      throw new Error(`Invalid ${typeName.toLowerCase()} format. Must be ${description}: ${value}`);
    }
    return value as T;
  };
}

/**
 * Create a parse function that returns a Result
 */
function createParser<T extends StringBrand<string>>(
  typeName: string,
  validator: (value: string) => value is T
): (value: string) => Result<T> {
  return (value: string): Result<T> => {
    if (validator(value)) {
      return Ok(value as T);
    }
    const metadata = TYPE_METADATA[typeName as keyof typeof TYPE_METADATA];
    const description = metadata?.description || 'valid format';
    return Err(new Error(`Invalid ${typeName.toLowerCase()} format. Must be ${description}: ${value}`));
  };
}

// ============================================================================
// GENERATED TYPE GUARDS
// ============================================================================

export const isFirestoreStudentId = createValidator<FirestoreStudentId>('FirestoreStudentId', TYPE_METADATA.FirestoreStudentId.validate);
export const isDriveFolderId = createValidator<DriveFolderId>('DriveFolderId', TYPE_METADATA.DriveFolderId.validate);
export const isTeacherId = createValidator<TeacherId>('TeacherId', TYPE_METADATA.TeacherId.validate);
export const isNoteId = createValidator<NoteId>('NoteId', TYPE_METADATA.NoteId.validate);
export const isKeyConceptId = createValidator<KeyConceptId>('KeyConceptId', TYPE_METADATA.KeyConceptId.validate);
export const isLoginAuditId = createValidator<LoginAuditId>('LoginAuditId', TYPE_METADATA.LoginAuditId.validate);
export const isDriveFileId = createValidator<DriveFileId>('DriveFileId', TYPE_METADATA.DriveFileId.validate);
export const isSubjectId = createValidator<SubjectId>('SubjectId', TYPE_METADATA.SubjectId.validate);
export const isTopicId = createValidator<TopicId>('TopicId', TYPE_METADATA.TopicId.validate);

export const isEmail = createValidator<Email>('Email', TYPE_METADATA.Email.validate);
export const isTeacherEmail = createValidator<TeacherEmail>('TeacherEmail', TYPE_METADATA.TeacherEmail.validate);
export const isPin = createValidator<Pin>('Pin', TYPE_METADATA.Pin.validate);
export const isPinHash = createValidator<PinHash>('PinHash', TYPE_METADATA.PinHash.validate);
export const isIPAddress = createValidator<IPAddress>('IPAddress', TYPE_METADATA.IPAddress.validate);
export const isUserAgent = createValidator<UserAgent>('UserAgent', TYPE_METADATA.UserAgent.validate);

export const isFileName = createValidator<FileName>('FileName', TYPE_METADATA.FileName.validate);
export const isCleanFileName = createValidator<CleanFileName>('CleanFileName', TYPE_METADATA.CleanFileName.validate);
export const isFolderName = createValidator<FolderName>('FolderName', TYPE_METADATA.FolderName.validate);

// Import validation functions from taxonomy.ts
import { isValidSubject, isValidTopicGroup, isValidLevel } from '../data/taxonomy';

export const isSubject = isValidSubject;
export const isTopicGroup = isValidTopicGroup;
export const isLevel = isValidLevel;
// Note: Topic validation is handled through topicGroup validation in taxonomy.ts
export const isTopic = (value: string): value is Topic => {
  // Topic validation requires checking against the specific topic group
  // This is handled in the taxonomy validation functions
  return value.length > 0 && value.length <= 200;
};
export const isSchoolYear = createValidator<SchoolYear>('SchoolYear', TYPE_METADATA.SchoolYear.validate);

export const isDriveUrl = createValidator<DriveUrl>('DriveUrl', TYPE_METADATA.DriveUrl.validate);
export const isDownloadUrl = createValidator<DownloadUrl>('DownloadUrl', TYPE_METADATA.DownloadUrl.validate);
export const isViewUrl = createValidator<ViewUrl>('ViewUrl', TYPE_METADATA.ViewUrl.validate);
export const isThumbnailUrl = createValidator<ThumbnailUrl>('ThumbnailUrl', TYPE_METADATA.ThumbnailUrl.validate);

export const isStudentName = createValidator<StudentName>('StudentName', TYPE_METADATA.StudentName.validate);
export const isTeacherName = createValidator<TeacherName>('TeacherName', TYPE_METADATA.TeacherName.validate);

// ============================================================================
// GENERATED FACTORY FUNCTIONS
// ============================================================================

export const createFirestoreStudentId = createFactory<FirestoreStudentId>('FirestoreStudentId', isFirestoreStudentId);
export const createDriveFolderId = createFactory<DriveFolderId>('DriveFolderId', isDriveFolderId);
export const createTeacherId = createFactory<TeacherId>('TeacherId', isTeacherId);
export const createNoteId = createFactory<NoteId>('NoteId', isNoteId);
export const createKeyConceptId = createFactory<KeyConceptId>('KeyConceptId', isKeyConceptId);
export const createLoginAuditId = createFactory<LoginAuditId>('LoginAuditId', isLoginAuditId);
export const createDriveFileId = createFactory<DriveFileId>('DriveFileId', isDriveFileId);
export const createSubjectId = createFactory<SubjectId>('SubjectId', isSubjectId);
export const createTopicId = createFactory<TopicId>('TopicId', isTopicId);

export const createEmail = createFactory<Email>('Email', isEmail);
export const createTeacherEmail = createFactory<TeacherEmail>('TeacherEmail', isTeacherEmail);
export const createPin = createFactory<Pin>('Pin', isPin);
export const createPinHash = createFactory<PinHash>('PinHash', isPinHash);

export const createStudentName = createFactory<StudentName>('StudentName', isStudentName);
export const createTeacherName = createFactory<TeacherName>('TeacherName', isTeacherName);

export const createSubject = (value: string): Subject => {
  if (!isSubject(value)) {
    throw new Error(`Invalid subject: ${value}. Must be one of the valid subjects from taxonomy.`);
  }
  return value as Subject;
};

export const createTopicGroup = (value: string): TopicGroup => {
  if (!isTopicGroup(value)) {
    throw new Error(`Invalid topic group: ${value}. Must be one of the valid topic groups from taxonomy.`);
  }
  return value as TopicGroup;
};

export const createTopic = (value: string): Topic => {
  if (!isTopic(value)) {
    throw new Error(`Invalid topic: ${value}. Must be a valid topic.`);
  }
  return value as Topic;
};

export const createLevel = (value: string): Level => {
  if (!isLevel(value)) {
    throw new Error(`Invalid level: ${value}. Must be one of the valid levels from taxonomy.`);
  }
  return value as Level;
};
export const createSchoolYear = createFactory<SchoolYear>('SchoolYear', isSchoolYear);

export const createFileName = createFactory<FileName>('FileName', isFileName);
export const createCleanFileName = createFactory<CleanFileName>('CleanFileName', isCleanFileName);
export const createFolderName = createFactory<FolderName>('FolderName', isFolderName);

export const createDriveUrl = createFactory<DriveUrl>('DriveUrl', isDriveUrl);
export const createDownloadUrl = createFactory<DownloadUrl>('DownloadUrl', isDownloadUrl);
export const createViewUrl = createFactory<ViewUrl>('ViewUrl', isViewUrl);
export const createThumbnailUrl = createFactory<ThumbnailUrl>('ThumbnailUrl', isThumbnailUrl);

export const createIPAddress = createFactory<IPAddress>('IPAddress', isIPAddress);
export const createUserAgent = createFactory<UserAgent>('UserAgent', isUserAgent);

// ============================================================================
// GENERATED PARSE FUNCTIONS
// ============================================================================

export const parseEmail = createParser<Email>('Email', isEmail);
export const parseTeacherEmail = createParser<TeacherEmail>('TeacherEmail', isTeacherEmail);
export const parsePin = createParser<Pin>('Pin', isPin);

// ============================================================================
// LEGACY COMPATIBILITY FUNCTIONS
// ============================================================================

/**
 * The type of student ID being used in API calls
 */
export type StudentIdType = 'firestore' | 'drive';

/**
 * Cache types for different data categories
 */
export type CacheType = 'files' | 'metadata' | 'students' | 'fileMetadata';

/**
 * Parameters for student API endpoints
 */
export interface StudentApiParams {
  /** The student ID (either Firestore ID or Drive folder ID) */
  id: string;
  /** The type of ID being used (defaults to 'firestore') */
  idType?: StudentIdType;
}

/**
 * Type guard to check if a string could be either type of ID
 */
export function isStudentId(id: string): id is FirestoreStudentId | DriveFolderId {
  return isFirestoreStudentId(id) || isDriveFolderId(id);
}

/**
 * Determine the most likely ID type based on the string format
 */
export function detectIdType(id: string): StudentIdType {
  if (isFirestoreStudentId(id)) {
    return 'firestore';
  } else if (isDriveFolderId(id)) {
    return 'drive';
  } else {
    throw new Error(`Unable to detect ID type for: ${id}`);
  }
}