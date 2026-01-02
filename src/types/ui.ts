/**
 * UI component types
 */

import type { FileInfo } from './file';
import type { FilterState } from './filter';

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

export interface SessionProviderProps {
  children: React.ReactNode;
}

export interface QueryProviderProps {
  children: React.ReactNode;
}

export interface DarkModeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export interface AdminNavigationUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface AdminNavigationProps {
  user: AdminNavigationUser;
}

export interface ThumbnailOptions {
  fileId: string;
  fileName?: string;
  fileType?: string;
  size?: 'small' | 'medium' | 'large';
}

export interface SchoolYearInfo {
  schoolYear: string;
  academicYear: string;
  semester: 'Eerste' | 'Tweede';
  period: string;
}

