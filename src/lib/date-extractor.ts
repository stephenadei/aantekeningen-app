/**
 * Extract date from filename/title
 * Handles formats like "Priveles 15 Oct 2025 15_52_52" or "15 Oct 2025"
 */

export interface ExtractedDate {
  date: Date;
  originalString: string;
}

/**
 * Extract date from filename/title
 * Supports formats:
 * - "Priveles 15 Oct 2025 15_52_52"
 * - "15 Oct 2025"
 * - "15 October 2025"
 * - "15-10-2025"
 * - "2025-10-15"
 */
export function extractDateFromTitle(title: string): Date | null {
  if (!title) return null;

  const monthMap: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };

  // Pattern 1: "15 Oct 2025" or "15 October 2025" (with optional time suffix like "15_52_52")
  const pattern1 = /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i;
  const match1 = title.match(pattern1);
  if (match1) {
    const day = parseInt(match1[1]);
    const monthName = match1[2].toLowerCase();
    const year = parseInt(match1[3]);
    const month = monthMap[monthName];
    
    if (month !== undefined && day >= 1 && day <= 31 && year >= 2000 && year <= 2100) {
      return new Date(year, month, day);
    }
  }

  // Pattern 2: "15-10-2025" or "15/10/2025" (DD-MM-YYYY)
  const pattern2 = /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/;
  const match2 = title.match(pattern2);
  if (match2) {
    const day = parseInt(match2[1]);
    const month = parseInt(match2[2]) - 1; // Month is 0-indexed
    const year = parseInt(match2[3]);
    
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year >= 2000 && year <= 2100) {
      return new Date(year, month, day);
    }
  }

  // Pattern 3: "2025-10-15" (YYYY-MM-DD)
  const pattern3 = /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/;
  const match3 = title.match(pattern3);
  if (match3) {
    const year = parseInt(match3[1]);
    const month = parseInt(match3[2]) - 1; // Month is 0-indexed
    const day = parseInt(match3[3]);
    
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year >= 2000 && year <= 2100) {
      return new Date(year, month, day);
    }
  }

  return null;
}

/**
 * Get the best date to use for a file
 * Priority: dateFromTitle > pdfCreationDate > lessonDate > modifiedTime
 */
export function getFileDate(file: { 
  modifiedTime: string;
  dateFromTitle?: Date | string | null;
  pdfCreationDate?: Date | string | null;
  lessonDate?: string | Date | null;
}): Date {
  // First try date from title (handle both Date and string)
  if (file.dateFromTitle) {
    if (file.dateFromTitle instanceof Date) {
      return file.dateFromTitle;
    }
    if (typeof file.dateFromTitle === 'string') {
      const parsed = new Date(file.dateFromTitle);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }
  
  // Then try PDF creation date
  if (file.pdfCreationDate) {
    if (file.pdfCreationDate instanceof Date) {
      return file.pdfCreationDate;
    }
    if (typeof file.pdfCreationDate === 'string') {
      const parsed = new Date(file.pdfCreationDate);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }
  
  // Then try lessonDate
  if (file.lessonDate) {
    const lessonDate = typeof file.lessonDate === 'string' 
      ? new Date(file.lessonDate) 
      : file.lessonDate;
    if (!isNaN(lessonDate.getTime())) {
      return lessonDate;
    }
  }
  
  // Fallback to modifiedTime (import date)
  return new Date(file.modifiedTime);
}

