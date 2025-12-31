/**
 * Enhanced title formatting utilities
 * Creates user-friendly titles from filenames and metadata
 */

import type { FileInfo } from './interfaces';
import { getSubjectDisplayNameFromString } from '../data/taxonomy';

/**
 * Format a date string to a readable format
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return '';
  }
}

/**
 * Clean filename by removing common prefixes and formatting
 */
function cleanBaseFileName(fileName: string): string {
  // Remove file extension
  let clean = fileName.replace(/\.(pdf|doc|docx|txt|note|notability)$/i, '');
  
  // Remove common prefixes
  clean = clean.replace(/^(Privéles|Prive|Note|Les|Lesson|Lesmateriaal|Materiaal)\s*/i, '');
  
  // Remove version numbers like (2), (3), etc.
  clean = clean.replace(/\s*\(\d+\)$/, '');
  
  // Remove timestamps like 12_31_26, 14_08_23
  clean = clean.replace(/\s+\d{1,2}_\d{2}_\d{2}$/, '');
  
  // Format dates from YYYY-MM-DD to DD-MM-YYYY
  clean = clean.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3-$2-$1');
  
  // Clean up extra spaces
  clean = clean.replace(/\s+/g, ' ').trim();
  
  return clean || fileName.replace(/\.(pdf|doc|docx|txt|note|notability)$/i, '');
}

/**
 * Generate a user-friendly title from file info and metadata
 * Format: "Subject - Topic (Level) - Date" or "Clean Filename - Date"
 */
export function formatFileTitle(file: FileInfo): string {
  const parts: string[] = [];
  
  // Add subject if available
  if (file.subject) {
    const subjectDisplay = getSubjectDisplayNameFromString(file.subject);
    if (subjectDisplay && subjectDisplay !== 'Onbekend') {
      parts.push(subjectDisplay);
    }
  }
  
  // Add topic if available
  if (file.topic) {
    // Capitalize first letter of each word
    const topicDisplay = file.topic
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    parts.push(topicDisplay);
  }
  
  // Add level if available
  if (file.level) {
    const levelDisplay = file.level
      .replace(/^vo-/, '')
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    if (levelDisplay && levelDisplay !== 'Mixed') {
      parts.push(`(${levelDisplay})`);
    }
  }
  
  // Add date from modifiedTime
  if (file.modifiedTime) {
    const dateStr = formatDate(file.modifiedTime);
    if (dateStr) {
      parts.push(dateStr);
    }
  }
  
  // If we have metadata-based parts, use them
  if (parts.length > 0) {
    return parts.join(' - ');
  }
  
  // Fallback to cleaned filename
  const cleanName = cleanBaseFileName(file.name);
  
  // If filename already contains date, use it as-is
  if (cleanName.match(/\d{2}-\d{2}-\d{4}/)) {
    return cleanName;
  }
  
  // Otherwise add date if available
  if (file.modifiedTime) {
    const dateStr = formatDate(file.modifiedTime);
    if (dateStr) {
      return `${cleanName} - ${dateStr}`;
    }
  }
  
  return cleanName;
}

/**
 * Generate a short title (without date) for compact displays
 */
export function formatShortTitle(file: FileInfo): string {
  const parts: string[] = [];
  
  if (file.subject) {
    const subjectDisplay = getSubjectDisplayNameFromString(file.subject);
    if (subjectDisplay && subjectDisplay !== 'Onbekend') {
      parts.push(subjectDisplay);
    }
  }
  
  if (file.topic) {
    const topicDisplay = file.topic
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    parts.push(topicDisplay);
  }
  
  if (parts.length > 0) {
    return parts.join(' - ');
  }
  
  return cleanBaseFileName(file.name);
}

