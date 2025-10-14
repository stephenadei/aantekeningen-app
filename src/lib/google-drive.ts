import { google } from 'googleapis';

// Google Drive API configuration
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

// Constants from the original Google Apps Script
const NOTABILITY_FOLDER_NAME = 'Notability';
const PRIVELES_FOLDER_NAME = 'Priveles';

// Cache configuration
const CACHE_DURATION_HOURS = parseInt(process.env.CACHE_DURATION_HOURS || '24');
const CACHE_KEY_STUDENTS = 'cached_students';
const CACHE_KEY_FILES = 'cached_files_';
const CACHE_KEY_AI_ANALYSIS = 'cached_ai_analysis_';

// In-memory cache (in production, consider using Redis)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const memoryCache = new Map<string, { data: any; timestamp: number }>();

export interface Student {
  id: string;
  name: string;
  subject: string;
  url: string;
}

export interface FileInfo {
  id: string;
  name: string;
  title: string;
  url: string;
  downloadUrl: string;
  viewUrl: string;
  thumbnailUrl: string;
  modifiedTime: string;
  size: number;
  // AI-generated metadata
  subject?: string;
  topic?: string;
  level?: string;
  schoolYear?: string;
  keywords?: string[];
  summary?: string;
  summaryEn?: string;
  topicEn?: string;
  keywordsEn?: string[];
}

export interface StudentOverview {
  fileCount: number;
  lastActivity: string | null;
  lastActivityDate: string;
}

class GoogleDriveService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private drive: any;
  private isInitialized = false;

  constructor() {
    this.initializeDrive();
  }

  private async initializeDrive() {
    try {
      if (typeof window !== 'undefined') {
        throw new Error('Google Drive API can only be used server-side');
      }

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "").replace(/\\n/g, "\n"),
        },
        scopes: SCOPES,
      });

      this.drive = google.drive({ version: 'v3', auth });
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Google Drive API:', error);
      throw error;
    }
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initializeDrive();
    }
  }

  /**
   * Cache management functions
   */
  private getCache(key: string) {
    const cached = memoryCache.get(key);
    if (cached) {
      const now = new Date().getTime();
      const cacheAge = now - cached.timestamp;
      const maxAge = CACHE_DURATION_HOURS * 60 * 60 * 1000; // Convert to milliseconds
      
      if (cacheAge < maxAge) {
        return cached.data;
      } else {
        memoryCache.delete(key);
      }
    }
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private setCache(key: string, data: any) {
    memoryCache.set(key, {
      data,
      timestamp: new Date().getTime()
    });
  }

  /**
   * Get the Priveles folder (where all student files are stored)
   */
  private async getPrivelesFolder(): Promise<string> {
    await this.ensureInitialized();

    // Use folder ID if provided in environment
    if (process.env.PRIVELES_FOLDER_ID) {
      return process.env.PRIVELES_FOLDER_ID;
    }

    // Use Notability folder ID if provided
    let notabilityFolderId = process.env.NOTABILITY_FOLDER_ID;
    
    if (!notabilityFolderId) {
      // Find Notability folder by name
      const response = await this.drive.files.list({
        q: `name='${NOTABILITY_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        pageSize: 1,
      });

      if (!response.data.files || response.data.files.length === 0) {
        throw new Error('Notability folder not found');
      }

      notabilityFolderId = response.data.files[0].id;
    }

    // Find Priveles folder within Notability
    const response = await this.drive.files.list({
      q: `name='${PRIVELES_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and '${notabilityFolderId}' in parents and trashed=false`,
      fields: 'files(id, name)',
      pageSize: 1,
    });

    if (!response.data.files || response.data.files.length === 0) {
      throw new Error('Priveles folder not found in Notability');
    }

    return response.data.files[0].id;
  }

  /**
   * Find student folders by name (case-insensitive, partial match)
   * Searches through all subject folders (WO, Rekenen, VO) for student names
   */
  async findStudentFolders(needle: string): Promise<Student[]> {
    try {
      // Try to get cached data first
      const cachedData = this.getCache(CACHE_KEY_STUDENTS);
      
      let allStudents: Student[] = [];
      
      if (cachedData) {
        console.log('Using cached student data (' + cachedData.students.length + ' students)');
        allStudents = cachedData.students;
      } else {
        console.log('Cache miss or expired, fetching fresh data...');
        // Fetch fresh data from Drive
        const privelesFolderId = await this.getPrivelesFolder();
        const subjectFolders = await this.drive.files.list({
          q: `'${privelesFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: 'files(id, name)',
        });

        allStudents = [];

        // Search through each subject folder
        for (const subjectFolder of subjectFolders.data.files || []) {
          const subjectName = subjectFolder.name;
          
          // Look for student folders within this subject
          const studentFolders = await this.drive.files.list({
            q: `'${subjectFolder.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
          });

          for (const studentFolder of studentFolders.data.files || []) {
            allStudents.push({
              id: studentFolder.id,
              name: studentFolder.name,
              subject: subjectName,
              url: `https://drive.google.com/drive/folders/${studentFolder.id}`
            });
          }
        }
        
        // Cache the fresh data
        this.setCache(CACHE_KEY_STUDENTS, {
          timestamp: new Date().getTime(),
          students: allStudents
        });
        
        console.log('✅ Cached ' + allStudents.length + ' students');
      }
      
      // Filter students based on search term
      if (!needle || typeof needle !== 'string') {
        console.log('❌ Invalid search term provided: ' + needle);
        return [];
      }
      
      const searchTerm = needle.toLowerCase();
      const matches = allStudents.filter(student => {
        const studentName = student.name.toLowerCase();
        return studentName === searchTerm || studentName.includes(searchTerm);
      });
      
      console.log('Found ' + matches.length + ' matches for "' + needle + '"');
      return matches;
    } catch (error) {
      console.error('❌ Error finding student folders: ' + error);
      return [];
    }
  }

  /**
   * List files in a student folder
   */
  async listFilesInFolder(folderId: string): Promise<FileInfo[]> {
    try {
      // Validate input
      if (!folderId || typeof folderId !== 'string') {
        console.log('Error: Invalid folderId provided to listFilesInFolder:', folderId);
        return [];
      }
      
      const cacheKey = CACHE_KEY_FILES + folderId;
      
      // Try to get cached data first
      const cachedData = this.getCache(cacheKey);
      
      if (cachedData) {
        console.log('Using cached file metadata for folder: ' + folderId);
        if (cachedData.files && Array.isArray(cachedData.files)) {
          return cachedData.files;
        } else {
          console.log('Warning: Cached data is invalid, refetching for folder: ' + folderId);
        }
      }
      
      console.log('Cache miss, fetching file metadata for folder: ' + folderId);
      
      await this.ensureInitialized();
      
      // Fetch only metadata from Drive (fast operation)
      const files = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, modifiedTime, size)',
        orderBy: 'modifiedTime desc',
      });

      const fileList: FileInfo[] = [];
      
      for (const file of files.data.files || []) {
        const fileName = file.name;
        const cleanTitle = this.cleanFileName(fileName);
        
        // Get AI analysis (cached or basic)
        const aiAnalysis = await this.analyzeDocumentWithAI(fileName);
        
        fileList.push({
          id: file.id,
          name: fileName,
          title: cleanTitle,
          url: `https://drive.google.com/file/d/${file.id}/view`,
          downloadUrl: `https://drive.google.com/uc?export=download&id=${file.id}`,
          viewUrl: `https://drive.google.com/file/d/${file.id}/view?usp=sharing`,
          thumbnailUrl: `https://drive.google.com/thumbnail?id=${file.id}&sz=w400-h400`,
          modifiedTime: file.modifiedTime,
          size: parseInt(file.size || '0'),
          // AI-generated metadata
          subject: aiAnalysis.subject,
          topic: aiAnalysis.topic,
          level: aiAnalysis.level,
          schoolYear: aiAnalysis.schoolYear,
          keywords: aiAnalysis.keywords,
          summary: aiAnalysis.summary,
          summaryEn: aiAnalysis.summaryEn,
          topicEn: aiAnalysis.topicEn,
          keywordsEn: aiAnalysis.keywordsEn
        });
      }
      
      // Sort by lesson date (newest first) - extract date from filename
      const sortedFiles = fileList.sort((a, b) => {
        const dateA = this.extractDateFromFilename(a.name);
        const dateB = this.extractDateFromFilename(b.name);
        
        // If both have dates, sort by date
        if (dateA && dateB) {
          return dateB.getTime() - dateA.getTime();
        }
        
        // If only one has date, prioritize it
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        
        // If neither has date, fall back to modification time
        return new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime();
      });
      
      // Cache the metadata (not file content)
      this.setCache(cacheKey, {
        timestamp: new Date().getTime(),
        files: sortedFiles
      });
      
      console.log('Cached metadata for ' + sortedFiles.length + ' files in folder: ' + folderId);
      
      return sortedFiles;
    } catch (error) {
      console.error('Error listing files: ' + error);
      return [];
    }
  }

  /**
   * Get student overview info (file count and last activity)
   */
  async getStudentOverview(folderId: string): Promise<StudentOverview> {
    try {
      console.log('🔍 getStudentOverview called for folderId:', folderId);
      
      // Validate input
      if (!folderId || typeof folderId !== 'string') {
        console.log('❌ Error: Invalid folderId provided to getStudentOverview:', folderId);
        return {
          fileCount: 0,
          lastActivity: null,
          lastActivityDate: 'Fout bij laden'
        };
      }
      
      // Try to get from cache first
      const cacheKey = CACHE_KEY_FILES + folderId;
      const cachedData = this.getCache(cacheKey);
      
      console.log('📊 Cache check for folderId:', folderId, 'cachedData:', !!cachedData);
      
      if (cachedData) {
        const files = cachedData.files;
        console.log('📁 Using cached data for folderId:', folderId, 'files count:', files ? files.length : 'null');
        
        // Validate cached files data
        if (!files || !Array.isArray(files)) {
          console.log('⚠️ Warning: Cached files data is invalid for folder:', folderId, 'files type:', typeof files);
          // Fall through to direct Drive access
        } else {
          if (files.length === 0) {
            return {
              fileCount: 0,
              lastActivity: null,
              lastActivityDate: 'Geen bestanden'
            };
          }
        
          const lastFile = files[0]; // Files are sorted by date, newest first
          
          // Try to get lesson date from filename, fallback to modified time
          const lessonDate = this.extractDateFromFilename(lastFile.name);
          const lastActivityDate = lessonDate ? 
            lessonDate.toLocaleDateString('nl-NL', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }) :
            new Date(lastFile.modifiedTime).toLocaleDateString('nl-NL', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
          
          return {
            fileCount: files.length,
            lastActivity: lessonDate ? lessonDate.toISOString() : lastFile.modifiedTime,
            lastActivityDate: lastActivityDate
          };
        }
      }
      
      // If not cached, get minimal info directly from Drive
      console.log('🔄 Fetching data directly from Drive for folderId:', folderId);
      
      await this.ensureInitialized();
      
      const files = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, modifiedTime)',
        orderBy: 'modifiedTime desc',
        pageSize: 1,
      });

      const fileCount = files.data.files?.length || 0;
      
      if (fileCount === 0) {
        return {
          fileCount: 0,
          lastActivity: null,
          lastActivityDate: 'Geen bestanden'
        };
      }
      
      const lastFile = files.data.files[0];
      const lastActivityDate = new Date(lastFile.modifiedTime).toLocaleDateString('nl-NL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      const result = {
        fileCount: fileCount,
        lastActivity: lastFile.modifiedTime,
        lastActivityDate: lastActivityDate
      };
      
      console.log('✅ getStudentOverview returning for folderId:', folderId, 'result:', JSON.stringify(result));
      return result;
      
    } catch (error) {
      console.error('❌ Error getting student overview for folderId:', folderId, 'error:', error);
      const errorResult = {
        fileCount: 0,
        lastActivity: null,
        lastActivityDate: 'Fout bij laden'
      };
      console.log('🔄 getStudentOverview returning error result:', JSON.stringify(errorResult));
      return errorResult;
    }
  }

  /**
   * Clean and format file names for better display
   */
  private cleanFileName(fileName: string): string {
    try {
      // Remove file extension
      let cleanName = fileName.replace(/\.(pdf|doc|docx|txt)$/i, '');
      
      // Remove common prefixes (more comprehensive)
      cleanName = cleanName.replace(/^(Privéles|Prive|Note|Les|Lesson|Lesmateriaal|Materiaal)\s*/i, '');
      
      // Remove version numbers like (2), (3), etc.
      cleanName = cleanName.replace(/\s*\(\d+\)$/, '');
      
      // Remove timestamps like 12_31_26, 14_08_23
      cleanName = cleanName.replace(/\s+\d{1,2}_\d{2}_\d{2}$/, '');
      
      // Format dates from YYYY-MM-DD to DD-MM-YYYY
      cleanName = cleanName.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3-$2-$1');
      
      // Capitalize first letter of each word, but keep dates intact
      cleanName = cleanName.replace(/\b\w/g, l => l.toUpperCase());
      
      // Clean up extra spaces
      cleanName = cleanName.replace(/\s+/g, ' ').trim();
      
      // If result is too short or empty, use a more descriptive fallback
      if (cleanName.length < 3) {
        cleanName = fileName.replace(/\.(pdf|doc|docx|txt)$/i, '');
      }
      
      console.log('Cleaned filename: "' + fileName + '" -> "' + cleanName + '"');
      return cleanName || fileName; // Fallback to original if cleaning fails
    } catch (error) {
      console.log('Error cleaning filename: ' + error);
      return fileName; // Fallback to original
    }
  }

  /**
   * Extract date from filename
   */
  private extractDateFromFilename(filename: string): Date | null {
    try {
      // Try to extract date from filename format: YYYY-MM-DD__topic__v001.pdf
      const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        return new Date(dateMatch[1]);
      }
      
      // Fallback: try other common date formats
      const altDateMatch = filename.match(/(\d{4})[_-](\d{2})[_-](\d{2})/);
      if (altDateMatch) {
        return new Date(parseInt(altDateMatch[1]), parseInt(altDateMatch[2]) - 1, parseInt(altDateMatch[3]));
      }
      
      return null;
    } catch (error) {
      console.log('Error extracting date from filename: ' + filename + ' - ' + error);
      return null;
    }
  }

  /**
   * Analyze document content with OpenAI to extract metadata
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async analyzeDocumentWithAI(fileName: string): Promise<any> {
    try {
      // Check cache first
      const cacheKey = CACHE_KEY_AI_ANALYSIS + fileName.substring(0, 50); // Limit to 50 chars
      const cachedData = this.getCache(cacheKey);
      
      if (cachedData) {
        console.log('Using cached AI analysis for: ' + fileName);
        return cachedData.analysis;
      }
      
      // If no API key, return basic analysis
      if (!process.env.OPENAI_API_KEY) {
        console.log('No OpenAI API key configured, using basic analysis');
        return this.basicAnalysis(fileName);
      }
      
      console.log('Analyzing document with AI: ' + fileName);
      
      // Prepare prompt for OpenAI with bilingual support
      const prompt = `Analyze this document and extract metadata. Return a JSON object with:
      - subject: The main subject/vak from this list: Wiskunde A, Wiskunde B, Wiskunde C, Wiskunde D, Natuurkunde, Scheikunde, Informatica, Programmeren, Python, Rekenen, Statistiek, Data-analyse
      - topic: The specific topic/onderwerp (e.g., "Algebra", "Functies", "Differentiëren", "Integreren", "Mechanica", "Elektriciteit", "Organische chemie", "Python basics", "Statistiek")
      - level: Educational level (e.g., "VO", "WO", "HBO")
      - schoolYear: School year in format "YY/YY" (e.g., "24/25", "23/24", "22/23")
      - keywords: Array of 3-5 relevant keywords
      - summary: Brief 1-sentence summary
      - summaryEn: Brief 1-sentence summary in English
      - topicEn: The specific topic in English
      - keywordsEn: Array of 3-5 relevant keywords in English
      
      Document name: "${fileName}"
      
      Return only valid JSON, no other text.`;
      
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at analyzing educational documents and extracting metadata. Always return valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.3
        })
      });
      
      const responseData = await response.json();
      const analysis = JSON.parse(responseData.choices[0].message.content);
      
      // Cache the result
      this.setCache(cacheKey, {
        timestamp: new Date().getTime(),
        analysis: analysis
      });
      
      console.log('AI analysis completed for: ' + fileName);
      return analysis;
      
    } catch (error) {
      console.log('Error in AI analysis: ' + error);
      return this.basicAnalysis(fileName);
    }
  }

  /**
   * Basic analysis when AI is not available
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private basicAnalysis(fileName: string): any {
    const analysis = {
      subject: 'Onbekend',
      topic: 'Algemeen',
      level: 'VO',
      schoolYear: '24/25',
      keywords: ['lesmateriaal'],
      summary: 'Lesmateriaal document',
      topicEn: 'General',
      keywordsEn: ['study material'],
      summaryEn: 'Study material document'
    };
    
    // Try to extract subject from filename
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('wiskunde') || lowerName.includes('math')) {
      analysis.subject = 'Wiskunde';
      analysis.topic = 'Wiskunde';
      analysis.topicEn = 'Mathematics';
      analysis.keywords = ['wiskunde', 'rekenen', 'algebra'];
      analysis.keywordsEn = ['mathematics', 'calculations', 'algebra'];
    } else if (lowerName.includes('nederlands') || lowerName.includes('dutch')) {
      analysis.subject = 'Nederlands';
      analysis.topic = 'Taal';
      analysis.topicEn = 'Language';
      analysis.keywords = ['nederlands', 'taal', 'grammatica'];
      analysis.keywordsEn = ['dutch', 'language', 'grammar'];
    } else if (lowerName.includes('biologie') || lowerName.includes('biology')) {
      analysis.subject = 'Biologie';
      analysis.topic = 'Natuurwetenschappen';
      analysis.topicEn = 'Natural Sciences';
      analysis.keywords = ['biologie', 'natuur', 'cellen'];
      analysis.keywordsEn = ['biology', 'nature', 'cells'];
    } else if (lowerName.includes('scheikunde') || lowerName.includes('chemistry')) {
      analysis.subject = 'Scheikunde';
      analysis.topic = 'Natuurwetenschappen';
      analysis.topicEn = 'Natural Sciences';
      analysis.keywords = ['scheikunde', 'chemie', 'moleculen'];
      analysis.keywordsEn = ['chemistry', 'molecules', 'reactions'];
    } else if (lowerName.includes('fysica') || lowerName.includes('physics')) {
      analysis.subject = 'Fysica';
      analysis.topic = 'Natuurwetenschappen';
      analysis.topicEn = 'Natural Sciences';
      analysis.keywords = ['fysica', 'natuurkunde', 'mechanica'];
      analysis.keywordsEn = ['physics', 'mechanics', 'forces'];
    }
    
    // Extract school year from filename if present
    const yearMatch = fileName.match(/(\d{4})/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      if (year >= 2020 && year <= 2030) {
        // Convert to school year format (e.g., 2024 -> 24/25)
        const shortYear = year.toString().slice(-2);
        const nextShortYear = (year + 1).toString().slice(-2);
        analysis.schoolYear = `${shortYear}/${nextShortYear}`;
      }
    }
    
    // Also check for explicit school year in filename (e.g., "2024-10-15__wiskunde_24-25__v001.pdf")
    const explicitYearMatch = fileName.match(/(\d{2})[_-](\d{2})/);
    if (explicitYearMatch) {
      const year1 = explicitYearMatch[1];
      const year2 = explicitYearMatch[2];
      analysis.schoolYear = `${year1}/${year2}`;
    }
    
    // Try to extract level
    if (lowerName.includes('wo') || lowerName.includes('universiteit')) {
      analysis.level = 'WO';
    } else if (lowerName.includes('hbo')) {
      analysis.level = 'HBO';
    }
    
    return analysis;
  }

  /**
   * Clear all cache data
   */
  clearCache(): { success: boolean; message: string } {
    try {
      memoryCache.clear();
      console.log('✅ Cache cleared successfully');
      return { success: true, message: 'Cache cleared' };
    } catch (error) {
      console.log('❌ Error clearing cache: ' + error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Test function to verify Drive access
   */
  async testDriveAccess(): Promise<{ success: boolean; message: string; folderCount?: number }> {
    try {
      console.log('🧪 Testing Google Drive access...');
      console.log('✅ Successfully connected to Google Drive');
      
      const privelesFolderId = await this.getPrivelesFolder();
      console.log('✅ Found Priveles folder ID: ' + privelesFolderId);
      
      const subjectFolders = await this.drive.files.list({
        q: `'${privelesFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
      });

      let totalStudents = 0;
      
      for (const subjectFolder of subjectFolders.data.files || []) {
        const subjectName = subjectFolder.name;
        console.log('📚 Subject: ' + subjectName);
        
        const studentFolders = await this.drive.files.list({
          q: `'${subjectFolder.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: 'files(id, name)',
        });

        const studentCount = studentFolders.data.files?.length || 0;
        totalStudents += studentCount;
        
        console.log('   👥 ' + studentCount + ' students');
      }
      
      console.log('📊 Total students found: ' + totalStudents);
      console.log('🎉 Drive access test completed!');
      
      return {
        success: true,
        message: `Successfully connected to Google Drive. Found ${totalStudents} students.`,
        folderCount: totalStudents
      };
    } catch (error) {
      console.log('❌ Error: ' + error);
      return {
        success: false,
        message: `Failed to connect to Google Drive: ${error}`
      };
    }
  }
}

// Export singleton instance
export const googleDriveService = new GoogleDriveService();
