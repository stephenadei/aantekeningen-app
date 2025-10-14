/**
 * Utility functions for automatically determining school years from file dates
 */

export interface SchoolYearInfo {
  schoolYear: string;
  academicYear: string;
  semester: 'Eerste' | 'Tweede';
  period: string;
}

/**
 * Determines the school year based on a file's modification date
 * Dutch school year runs from August to July
 */
export function getSchoolYearFromDate(dateString: string): SchoolYearInfo {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12

  let schoolYear: string;
  let academicYear: string;
  let semester: 'Eerste' | 'Tweede';
  let period: string;

  if (month >= 8) {
    // August-December: First semester of current academic year
    schoolYear = `${year}-${year + 1}`;
    academicYear = `${year}/${year + 1}`;
    semester = 'Eerste';
    
    if (month >= 8 && month <= 10) {
      period = 'Q1 (Aug-Okt)';
    } else {
      period = 'Q2 (Nov-Dec)';
    }
  } else {
    // January-July: Second semester of previous academic year
    schoolYear = `${year - 1}-${year}`;
    academicYear = `${year - 1}/${year}`;
    semester = 'Tweede';
    
    if (month >= 1 && month <= 3) {
      period = 'Q3 (Jan-Mrt)';
    } else if (month >= 4 && month <= 6) {
      period = 'Q4 (Apr-Jun)';
    } else {
      period = 'Q4 (Jul)';
    }
  }

  return {
    schoolYear,
    academicYear,
    semester,
    period
  };
}

/**
 * Gets a human-readable school year label
 */
export function getSchoolYearLabel(dateString: string): string {
  const info = getSchoolYearFromDate(dateString);
  return `${info.academicYear} (${info.semester} semester)`;
}

/**
 * Gets a short school year label for filtering
 */
export function getSchoolYearShort(dateString: string): string {
  const info = getSchoolYearFromDate(dateString);
  return info.schoolYear;
}

/**
 * Gets the current school year based on today's date
 */
export function getCurrentSchoolYear(): SchoolYearInfo {
  return getSchoolYearFromDate(new Date().toISOString());
}
