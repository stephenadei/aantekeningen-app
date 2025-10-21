/**
 * Centralized interface definitions to avoid redundancies across the codebase
 * All interfaces should be defined here and imported where needed
 */

import type {
  FirestoreStudentId,
  DriveFolderId,
  TeacherId,
  NoteId,
  KeyConceptId,
  LoginAuditId,
  DriveFileId,
  SubjectId,
  TopicId,
  Email,
  TeacherEmail,
  Pin,
  PinHash,
  IPAddress,
  UserAgent,
  FileName,
  CleanFileName,
  FolderName,
  Subject,
  TopicGroup,
  Topic,
  Level,
  SchoolYear,
  DriveUrl,
  DownloadUrl,
  ViewUrl,
  ThumbnailUrl,
  StudentName,
  TeacherName
} from './types';

// ============================================================================
// CORE ENTITY INTERFACES
// ============================================================================

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
  subject?: Subject;
  createdAt: string;
  lastLoginAt?: string;
  isActive: boolean;
  tags?: StudentTag[];
}

export interface Note {
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

export interface KeyConcept {
  id: KeyConceptId;
  noteId: NoteId;
  concept: string;
  definition: string;
  examples?: string[];
  importance: 'low' | 'medium' | 'high';
  createdAt: string;
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
  folderName: FolderName;
  studentName?: StudentName;
  subject?: Subject;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
  confirmedAt?: string;
  confirmedBy?: TeacherId;
}

export interface LoginAudit {
  id: LoginAuditId;
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

// ============================================================================
// GOOGLE DRIVE INTERFACES
// ============================================================================

export interface DriveStudent {
  id: DriveFolderId;
  name: StudentName;
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

// ============================================================================
// FILTER & UI INTERFACES
// ============================================================================

export interface FilterState {
  subjects: string[];
  topicGroups: string[];
  topics: string[];
  levels: string[];
  schoolYears: string[];
  keywords: string[];
  dateRange: {
    type: 'all' | 'days' | 'weeks' | 'months' | 'years' | 'custom';
    value?: number;
    startDate?: Date;
    endDate?: Date;
  };
  sortBy: 'date' | 'name' | 'subject' | 'topic';
  sortOrder: 'asc' | 'desc';
  searchText: string;
}

// ============================================================================
// API INTERFACES
// ============================================================================

export interface StudentApiParams {
  id: string;
  idType?: 'firestore' | 'drive' | 'auto';
}

// ============================================================================
// FIREBASE AUTH INTERFACES
// ============================================================================

export interface FirebaseUser {
  uid: string;
  email?: string;
  name?: string;
  displayName?: string;
  picture?: string;
  photoURL?: string;
  emailVerified: boolean;
  customClaims?: Record<string, unknown>;
}

export interface AuthResult {
  success: boolean;
  user?: FirebaseUser;
  error?: string;
  token?: string;
}

// ============================================================================
// CACHE INTERFACES
// ============================================================================

export interface DriveCache {
  id: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: string | Date; // ISO string or Date
  expiresAt: string | Date; // ISO string or Date
  studentId?: FirestoreStudentId;
  folderId?: DriveFolderId;
  lastModified?: string | Date; // ISO string or Date
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

// ============================================================================
// SECURITY INTERFACES
// ============================================================================

export interface RateLimitOptions {
  windowMs: number;
  maxAttempts: number;
  keyGenerator?: (req: unknown) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// ============================================================================
// UTILITY INTERFACES
// ============================================================================

export interface SchoolYearInfo {
  schoolYear: string;
  academicYear: string;
  semester: 'Eerste' | 'Tweede';
  period: string;
}

// ============================================================================
// CREATE INPUT INTERFACES
// ============================================================================

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

export interface CreateStudentTagInput {
  studentId: FirestoreStudentId;
  tag: string;
  color?: string;
}

export interface CreateUnlinkedFolderInput {
  driveFolderId: DriveFolderId;
  folderName: FolderName;
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

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

export interface TeacherStats {
  totalTeachers: number;
  activeTeachers: number;
  recentLogins: number;
  lastActivity: Date | null;
}

export interface SecurityContext {
  ip: string;
  userAgent: string;
  timestamp: Date;
}

export interface LoginAttempt {
  email: string;
  pin?: string;
  success: boolean;
  reason?: string;
  context: SecurityContext;
}

export interface ThumbnailOptions {
  fileId: string;
  fileName?: string;
  fileType?: string;
  size?: 'small' | 'medium' | 'large';
}

// ============================================================================
// ADMIN INTERFACES
// ============================================================================

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

export interface AuditResponse {
  audits: LoginAudit[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
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

export interface CacheStats {
  totalEntries: number;
  expiredEntries: number;
  byType: Record<string, number>;
}

// ============================================================================
// API RESPONSE INTERFACES
// ============================================================================

export interface StudentFilesResponse {
  success: boolean;
  files: FileInfo[];
  count: number;
  totalCount: number;
  hasMore: boolean;
  fromCache?: boolean;
  cacheFresh?: boolean;
}

// ============================================================================
// ADMIN MANAGEMENT INTERFACES
// ============================================================================

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
  description: string;
  color: string;
  icon: string;
}

export interface TopicFormData {
  name: string;
  description: string;
}

// ============================================================================
// DRIVE DATA INTERFACES
// ============================================================================

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

// ============================================================================
// STUDENT PORTAL INTERFACES
// ============================================================================

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

export interface MainPageStudent {
  id: string;
  displayName: string;
  subject: string;
  url: string;
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

// ============================================================================
// HOOK INTERFACES
// ============================================================================

export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
}

export interface UseNativeShareReturn {
  isSupported: boolean;
  share: (data: ShareData) => Promise<boolean>;
  isSharing: boolean;
}

// ============================================================================
// COMPONENT INTERFACES
// ============================================================================

export interface FileDetailModalKeyConcept {
  id: string;
  term: string;
  explanation: string;
  example?: string;
  isAiGenerated: boolean;
}

export interface FileDetailModalFileInfo {
  id: string;
  name: string;
  title: string;
  viewUrl: string;
  downloadUrl: string;
  subject?: string;
  topic?: string;
  level?: string;
  schoolYear?: string;
  summary?: string;
}

export interface FileDetailModalProps {
  file: FileInfo | null;
  studentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export interface EditConceptFormProps {
  concept: FileDetailModalKeyConcept;
  onSave: (updates: Partial<FileDetailModalKeyConcept>) => void;
  onCancel: () => void;
}

// ============================================================================
// UI COMPONENT INTERFACES
// ============================================================================

export interface AdvancedFiltersProps {
  files: FileInfo[];
  onFiltersChange: (filters: {
    subjects: string[];
    topics: string[];
    levels: string[];
    schoolYears: string[];
    keywords: string[];
  }) => void;
  className?: string;
}

export interface SkeletonLoaderProps {
  count?: number;
  className?: string;
  type?: 'file-card' | 'list-item' | 'text' | 'image';
}

export interface ThumbnailProps {
  src?: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  fileId?: string;
  fileType?: string;
  showFallback?: boolean;
}

export interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  onClear: () => void;
  currentFilters: FilterState;
  children: React.ReactNode;
}

export interface FilterSidebarContentProps {
  currentFilters: FilterState;
  onApply: (filters: FilterState) => void;
  onClear: () => void;
  subjectItems: Array<{ value: string; label: string; count: number }>;
  topicGroupItems: Array<{ value: string; label: string; count: number }>;
  topicItems: Array<{ value: string; label: string; count: number }>;
  levelItems: Array<{ value: string; label: string; count: number }>;
  schoolYearItems: Array<{ value: string; label: string; count: number }>;
  keywordItems: Array<{ value: string; label: string; count: number }>;
}

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export interface FilterItem {
  value: string;
  label: string;
  count?: number;
  color?: string;
}

export interface FilterSectionProps {
  title: string;
  items: FilterItem[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  icon?: React.ReactNode;
  defaultExpanded?: boolean;
}

export interface FilterPillProps {
  label: string;
  onRemove: () => void;
  color?: string;
}

export interface FilterPillsProps {
  pills: Array<{
    id: string;
    label: string;
    color?: string;
  }>;
  onRemovePill: (id: string) => void;
  onClearAll?: () => void;
}

export interface DateRangeFilterProps {
  value: {
    type: 'all' | 'days' | 'weeks' | 'months' | 'years' | 'custom';
    value?: number;
    startDate?: Date;
    endDate?: Date;
  };
  onChange: (value: {
    type: 'all' | 'days' | 'weeks' | 'months' | 'years' | 'custom';
    value?: number;
    startDate?: Date;
    endDate?: Date;
  }) => void;
}

// ============================================================================
// PROVIDER INTERFACES
// ============================================================================

export interface SessionProviderProps {
  children: React.ReactNode;
}

export interface QueryProviderProps {
  children: React.ReactNode;
}

// ============================================================================
// CONTEXT INTERFACES
// ============================================================================

export interface DarkModeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

// ============================================================================
// ADMIN COMPONENT INTERFACES
// ============================================================================

export interface AdminNavigationUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface AdminNavigationProps {
  user: AdminNavigationUser;
}

// ============================================================================
// INTERNAL SERVICE INTERFACES
// ============================================================================

export interface BatchOperation {
  type: 'create' | 'update' | 'delete';
  collection: string;
  docId?: string;
  data?: Record<string, unknown>;
}

export interface FirebaseAdminConfig {
  projectId: string;
  credential: unknown;
}

// ============================================================================
// ADMIN MANAGEMENT INTERFACES (Extended)
// ============================================================================

export interface AdminStudentWithMetadata extends Omit<Student, 'lastLoginAt'> {
  fileCount: number;
  lastActivity: string | null;
  lastLoginAt: string | null;
}

export interface AdminNoteWithMetadata extends FileMetadata {
  student: {
    id: string;
    displayName: string;
    subject?: string;
  };
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
