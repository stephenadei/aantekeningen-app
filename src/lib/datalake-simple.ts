import * as MinIO from 'minio';
import { 
  createDriveFolderId,
  createStudentName,
  createSubject,
  createDriveUrl,
  createDriveFileId,
  createFileName,
  createCleanFileName,
  createDownloadUrl,
  createViewUrl,
  createThumbnailUrl,
  type Subject
} from './types';
import type { DriveStudent, FileInfo, StudentOverview } from './interfaces';

// Datalake configuration
const BUCKET_NAME = 'educatie-lesmateriaal';
const BASE_PATH = 'notability/Priveles';
const CACHE_DURATION_HOURS = parseInt(process.env.CACHE_DURATION_HOURS || '12');
const CACHE_KEY_STUDENTS = 'cached_students';
const CACHE_KEY_FILES = 'cached_files_';

// In-memory cache
const memoryCache = new Map<string, { data: Record<string, unknown>; timestamp: number }>();

class DatalakeService {
  private minioClient!: MinIO.Client;
  private presignedClient!: MinIO.Client; // Separate client for presigned URLs
  private isInitialized = false;
  private presignedEndpoint: string | null = null;

  constructor() {
    this.initializeMinIO();
  }

  private initializeMinIO() {
    try {
      if (typeof window !== 'undefined') {
        throw new Error('MinIO client can only be used server-side');
      }

      const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
      const port = parseInt(process.env.MINIO_PORT || '9000');
      const useSSL = process.env.MINIO_SECURE === 'true';
      const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
      const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';

      // For internal connection, always use localhost (MinIO runs locally)
      const internalHostname = 'localhost';
      const internalPort = 9000;
      
      // Create internal client for operations
      this.minioClient = new MinIO.Client({
        endPoint: internalHostname,
        port: internalPort,
        useSSL: false, // Always false for localhost
        accessKey: accessKey,
        secretKey: secretKey,
      });

      // Create separate client for presigned URLs with public endpoint
      // This ensures presigned URLs have correct signature for public domain
      if (endpoint !== 'localhost' && !endpoint.includes('127.0.0.1')) {
        const protocol = useSSL ? 'https' : 'http';
        const publicPort = port === 80 || port === 443 ? '' : `:${port}`;
        this.presignedEndpoint = `${protocol}://${endpoint}${publicPort}`;
        
        // Create presigned client pointing to public endpoint
        // But still connect to localhost internally (nginx will proxy)
        this.presignedClient = new MinIO.Client({
          endPoint: endpoint,
          port: port,
          useSSL: useSSL,
          accessKey: accessKey,
          secretKey: secretKey,
        });
        
        console.log(`✅ MinIO client initialized (presigned URLs will use: ${this.presignedEndpoint})`);
      } else {
        this.presignedEndpoint = null;
        this.presignedClient = this.minioClient; // Use same client if no public endpoint
        console.log('✅ MinIO client initialized');
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize MinIO client:', error);
      throw error;
    }
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      this.initializeMinIO();
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
      const maxAge = CACHE_DURATION_HOURS * 60 * 60 * 1000;
      
      if (cacheAge < maxAge) {
        return cached.data;
      } else {
        memoryCache.delete(key);
      }
    }
    return null;
  }

  private setCache(key: string, data: any) {
    memoryCache.set(key, {
      data,
      timestamp: new Date().getTime()
    });
  }

  /**
   * Get all student folders from the datalake
   */
  async getAllStudentFolders(): Promise<DriveStudent[]> {
    await this.ensureInitialized();

    const students: DriveStudent[] = [];
    const subjectFolders = ['VO', 'Rekenen', 'WO'];

    for (const subject of subjectFolders) {
      const prefix = `${BASE_PATH}/${subject}/`;
      
      try {
        const objectsStream = this.minioClient.listObjects(BUCKET_NAME, prefix, true);
        
        const studentFolders = new Set<string>();
        let objectCount = 0;
        
        // List of known subject/vak names to filter out
        const knownSubjectNames = new Set([
          'wiskunde-a', 'wiskunde-b', 'rekenen-basis', 'rekenen',
          'vo', 'wo', 'engels', 'nederlands', 'frans', 'duits',
          'natuurkunde', 'scheikunde', 'biologie', 'geschiedenis',
          'aardrijkskunde', 'economie', 'maatschappijleer'
        ]);

        for await (const obj of objectsStream) {
          objectCount++;
          if (obj.name && obj.name !== prefix && !obj.name.endsWith('/')) {
            // Extract student name from path: notability/Priveles/VO/StudentName/file.pdf
            // Remove the prefix to get the relative path
            let relativePath = obj.name;
            if (obj.name.startsWith(prefix)) {
              relativePath = obj.name.substring(prefix.length);
            }
            const parts = relativePath.split('/').filter((p: string) => p.length > 0);
            if (parts.length > 0) {
              const potentialStudentName = parts[0];
              // Filter out known subject/vak names - these are not student names
              if (potentialStudentName && 
                  potentialStudentName.trim().length > 0 &&
                  !knownSubjectNames.has(potentialStudentName.toLowerCase())) {
                studentFolders.add(potentialStudentName);
              }
            }
          }
        }

        // Convert to DriveStudent objects
        for (const studentName of studentFolders) {
          try {
            const studentPath = `${prefix}${studentName}/`;
            const subjectLower = subject.toLowerCase() as 'vo' | 'rekenen' | 'wo';
            
            // Map subject to the correct format
            let subjectType: 'wiskunde-a' | 'rekenen-basis' | 'wiskunde-b' = 'wiskunde-a';
            if (subjectLower === 'rekenen') {
              subjectType = 'rekenen-basis';
            } else if (subjectLower === 'vo' || subjectLower === 'wo') {
              subjectType = 'wiskunde-a';
            }

            const student = {
              id: createDriveFolderId(studentPath), // Use path as ID
              name: createStudentName(studentName),
              subject: createSubject(subjectType),
              url: `/${BUCKET_NAME}/${studentPath}` as any, // Datalake path, not Google Drive URL
            };
            
            students.push(student);
          } catch (error) {
            console.error(`Error creating student object for ${studentName}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error listing students in ${subject}:`, error);
      }
    }

    return students;
  }

  /**
   * Find student folders by name (case-insensitive, partial match)
   */
  async findStudentFolders(needle: string): Promise<DriveStudent[]> {
    try {
      const cacheKey = CACHE_KEY_STUDENTS + needle.toLowerCase();
      const cachedData = this.getCache(cacheKey);
      
      if (cachedData) {
        return cachedData.students as DriveStudent[];
      }

      await this.ensureInitialized();
      
      const allStudents = await this.getAllStudentFolders();
      
      const searchLower = needle.toLowerCase();
      
      const matchingStudents = allStudents.filter(student => 
        student.name.toLowerCase().includes(searchLower)
      );

      this.setCache(cacheKey, { students: matchingStudents });
      return matchingStudents;
    } catch (error) {
      console.error('Error finding student folders:', error);
      throw error;
    }
  }

  /**
   * Convert student name to datalake path
   * Tries multiple subject folders (VO, Rekenen, WO) to find the student
   */
  async getStudentPath(studentName: string, subject?: string): Promise<string | null> {
    await this.ensureInitialized();

    // If subject is provided, try that first
    if (subject) {
      const subjectMap: Record<string, string> = {
        'wiskunde-a': 'VO',
        'wiskunde-b': 'VO',
        'rekenen': 'Rekenen',
        'wo': 'WO',
      };
      
      const subjectFolder = subjectMap[subject] || 'VO';
      const path = `${BASE_PATH}/${subjectFolder}/${studentName}/`;
      
      // Check if path exists
      try {
        const objectsStream = this.minioClient.listObjects(BUCKET_NAME, path, false);
        let hasFiles = false;
        for await (const obj of objectsStream) {
          if (obj.name && !obj.name.endsWith('/')) {
            hasFiles = true;
            break;
          }
        }
        if (hasFiles) {
          return path;
        }
      } catch (error) {
        // Path doesn't exist, continue to search
      }
    }

    // Search in all subject folders
    const subjectFolders = ['VO', 'Rekenen', 'WO'];
    for (const subjectFolder of subjectFolders) {
      const path = `${BASE_PATH}/${subjectFolder}/${studentName}/`;
      try {
        const objectsStream = this.minioClient.listObjects(BUCKET_NAME, path, false);
        let hasFiles = false;
        for await (const obj of objectsStream) {
          if (obj.name && !obj.name.endsWith('/')) {
            hasFiles = true;
            break;
          }
        }
        if (hasFiles) {
          return path;
        }
      } catch (error) {
        // Continue searching
      }
    }

    return null;
  }

  /**
   * List all files in a student folder
   * Accepts either a datalake path or a student name
   */
  async listFilesInFolder(folderPathOrStudentName: string, studentName?: string): Promise<FileInfo[]> {
    try {
      await this.ensureInitialized();

      // If it's a student name, convert to path
      let folderPath = folderPathOrStudentName;
      if (studentName) {
        const path = await this.getStudentPath(studentName);
        if (!path) {
          console.error(`Student folder not found for: ${studentName}`);
          return [];
        }
        folderPath = path;
      }

      const cacheKey = CACHE_KEY_FILES + folderPath;
      const cachedData = this.getCache(cacheKey);
      
      if (cachedData) {
        return cachedData.files as FileInfo[];
      }

      // Normalize folder path (remove leading/trailing slashes, ensure it ends with /)
      const normalizedPath = folderPath.replace(/^\/+|\/+$/g, '');
      const prefix = normalizedPath.endsWith('/') ? normalizedPath : `${normalizedPath}/`;

      const files: FileInfo[] = [];
      const objectsStream = this.minioClient.listObjects(BUCKET_NAME, prefix, false);

      for await (const obj of objectsStream) {
        if (!obj.name) continue;

        // Skip if it's a directory marker
        if (obj.name.endsWith('/')) continue;

        // Get file name from path
        const fileName = obj.name.split('/').pop() || obj.name;
        
        // Skip .note files if matching PDF exists
        if (fileName.endsWith('.note')) {
          const baseName = fileName.slice(0, -5);
          // Check if PDF exists (we'll check this after collecting all files)
          continue; // We'll filter later
        }

        // Generate presigned URL for download (valid for 7 days)
        // Use presignedClient which points to public endpoint for correct signature
        const downloadUrl = await this.presignedClient.presignedGetObject(
          BUCKET_NAME,
          obj.name,
          7 * 24 * 60 * 60 // 7 days
        );

        // Extract metadata from file name and path
        const cleanFileName = fileName.replace(/\.(pdf|note|notability)$/i, '');
        
        // Extract subject from path
        let subject: Subject | undefined;
        if (obj.name.includes('/VO/') || obj.name.includes('/WO/')) {
          subject = createSubject('wiskunde-a');
        } else if (obj.name.includes('/Rekenen/')) {
          subject = createSubject('rekenen');
        }

        const fileInfo: FileInfo = {
          id: createDriveFileId(obj.name),
          name: createFileName(fileName),
          title: createCleanFileName(cleanFileName),
          url: createDriveUrl(`/${BUCKET_NAME}/${obj.name}`),
          downloadUrl: createDownloadUrl(downloadUrl),
          viewUrl: createViewUrl(downloadUrl), // Same as download for now
          thumbnailUrl: createThumbnailUrl(''), // No thumbnails yet
          modifiedTime: obj.lastModified?.toISOString() || new Date().toISOString(),
          size: obj.size || 0,
          mimeType: this.getMimeType(fileName),
          subject,
        };

        files.push(fileInfo);
      }

      // Filter out .note files if matching PDF exists
      const fileNames = files.map(f => f.name);
      const filteredFiles = files.filter(file => {
        if (file.name.endsWith('.note')) {
          const baseName = file.name.slice(0, -5);
          const pdfName = createFileName(`${baseName}.pdf`);
          return !fileNames.includes(pdfName);
        }
        return true;
      });

      this.setCache(cacheKey, { files: filteredFiles });
      return filteredFiles;
    } catch (error) {
      console.error('Error listing files in folder:', error);
      throw error;
    }
  }

  /**
   * Get file information by file path
   */
  async getFileInfo(filePath: string): Promise<{ success: boolean; data?: FileInfo; error?: string }> {
    try {
      await this.ensureInitialized();

      // Get object metadata
      const stat = await this.minioClient.statObject(BUCKET_NAME, filePath);
      
      const fileName = filePath.split('/').pop() || filePath;
      const cleanFileName = fileName.replace(/\.(pdf|note|notability)$/i, '');

      // Generate presigned URL
      // Use presignedClient which points to public endpoint for correct signature
      const downloadUrl = await this.presignedClient.presignedGetObject(
        BUCKET_NAME,
        filePath,
        7 * 24 * 60 * 60
      );

      let subject: Subject | undefined;
      if (filePath.includes("/VO/") || filePath.includes("/WO/")) {
        subject = createSubject("wiskunde-a");
      } else if (filePath.includes("/Rekenen/")) {
        subject = createSubject("rekenen");
        subject = createSubject('rekenen');
      }

      const fileInfo: FileInfo = {
        id: createDriveFileId(filePath),
        name: createFileName(fileName),
        title: createCleanFileName(cleanFileName),
        url: createDriveUrl(`/${BUCKET_NAME}/${filePath}`),
        downloadUrl: createDownloadUrl(downloadUrl),
        viewUrl: createViewUrl(downloadUrl),
        thumbnailUrl: createThumbnailUrl(''),
        modifiedTime: stat.lastModified.toISOString(),
        size: stat.size,
        mimeType: this.getMimeType(fileName),
        subject,
      };

      return { success: true, data: fileInfo };
    } catch (error) {
      console.error('Error getting file info:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get student overview
   * Accepts either a datalake path or a student name
   */
  async getStudentOverview(folderPathOrStudentName: string, studentName?: string): Promise<StudentOverview> {
    try {
      await this.ensureInitialized();

      const files = await this.listFilesInFolder(folderPathOrStudentName, studentName);
      
      // Sort by modified time (newest first)
      const sortedFiles = files.sort((a, b) => 
        new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
      );

      const lastFile = sortedFiles[0];
      const fileCount = files.length;

      return {
        fileCount,
        lastActivity: lastFile ? `file: ${lastFile.title}` : 'no files',
        lastActivityDate: lastFile?.modifiedTime || new Date().toISOString(),
        lastFile: lastFile ? {
          id: lastFile.id,
          name: lastFile.name,
          title: lastFile.title,
          subject: lastFile.subject,
          topicGroup: lastFile.topicGroup,
          topic: lastFile.topic,
          summary: lastFile.summary,
          modifiedTime: lastFile.modifiedTime,
        } : undefined,
      };
    } catch (error) {
      console.error('Error getting student overview:', error);
      throw error;
    }
  }

  /**
   * Test datalake access
   */
  async testDatalakeAccess(): Promise<{ success: boolean; message?: string; folderCount?: number; debug?: any }> {
    try {
      await this.ensureInitialized();
      
      // Check if bucket exists
      const bucketExists = await this.minioClient.bucketExists(BUCKET_NAME);
      if (!bucketExists) {
        // List all buckets to help debug
        const allBuckets: string[] = [];
        try {
          // Try to list objects at root to see what buckets exist
          // Note: MinIO client doesn't have a direct listBuckets method in the way we need
          // So we'll just return the error
        } catch (e) {
          // Ignore
        }
        
        return {
          success: false,
          message: `Bucket ${BUCKET_NAME} does not exist`,
          debug: {
            bucketName: BUCKET_NAME,
            basePath: BASE_PATH,
            buckets: allBuckets
          }
        };
      }

      // Try to list some objects to see what's there
      const sampleObjects: string[] = [];
      const allPaths: string[] = [];
      try {
        const objectsStream = this.minioClient.listObjects(BUCKET_NAME, '', true);
        let count = 0;
        for await (const obj of objectsStream) {
          if (obj.name) {
            sampleObjects.push(obj.name);
            allPaths.push(obj.name);
            count++;
            if (count >= 50) break; // Get more to see structure
          }
        }
      } catch (e) {
        // Ignore listing errors
      }
      
      // Analyze paths to find common prefixes
      const pathPrefixes = new Set<string>();
      allPaths.forEach(path => {
        const parts = path.split('/');
        if (parts.length > 0) {
          pathPrefixes.add(parts[0]);
        }
        if (parts.length > 1) {
          pathPrefixes.add(`${parts[0]}/${parts[1]}`);
        }
        if (parts.length > 2) {
          pathPrefixes.add(`${parts[0]}/${parts[1]}/${parts[2]}`);
        }
      });

      // Try to list students
      const students = await this.getAllStudentFolders();
      
      return {
        success: true,
        message: 'Datalake access working',
        folderCount: students.length,
        debug: {
          bucketName: BUCKET_NAME,
          basePath: BASE_PATH,
          sampleObjects: sampleObjects.slice(0, 10),
          pathPrefixes: Array.from(pathPrefixes).slice(0, 10),
          studentsFound: students.length,
          totalObjectsFound: allPaths.length
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        debug: {
          error: error instanceof Error ? error.stack : String(error)
        }
      };
    }
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'note': 'application/x-notability',
      'notability': 'application/x-notability',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * Preload metadata (placeholder for compatibility)
   */
  async preloadMetadata(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      await this.ensureInitialized();
      const students = await this.getAllStudentFolders();
      
      return {
        success: true,
        message: `Preloaded metadata for ${students.length} students`,
        data: { studentCount: students.length }
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Download a file from the datalake as a buffer
   */
  async downloadFile(filePath: string): Promise<Buffer> {
    await this.ensureInitialized();
    
    const dataStream = await this.minioClient.getObject(BUCKET_NAME, filePath);
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      dataStream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      dataStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      
      dataStream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Analyze document content with OpenAI to extract metadata
   * This is similar to the Google Drive version but works with datalake files
   */
  async analyzeDocumentWithAI(fileName: string, filePath?: string, forceReanalyze = false): Promise<any> {
    try {
      const CACHE_KEY_AI_ANALYSIS = 'ai_analysis_';
      const cacheKey = CACHE_KEY_AI_ANALYSIS + fileName.substring(0, 50); // Limit to 50 chars
      
      if (!forceReanalyze) {
        const cachedData = this.getCache(cacheKey);
        
        if (cachedData) {
          console.log('Using cached AI analysis for: ' + fileName);
          return cachedData.analysis;
        }
      } else {
        console.log('Force re-analyzing with AI (ignoring cache): ' + fileName);
      }
      
      // If no API key, return basic analysis
      if (!process.env.OPENAI_API_KEY) {
        console.log('No OpenAI API key configured, using basic analysis');
        return this.basicAnalysis(fileName);
      }
      
      console.log('Analyzing document with AI: ' + fileName);
      
      // Prepare prompt for OpenAI with comprehensive taxonomy
      const prompt = `Analyze this educational document and extract metadata. Return a JSON object with:

SUBJECTS (choose the most appropriate):
- rekenen-basis, wiskunde-a, wiskunde-b, wiskunde-c, wiskunde-d
- economie, natuurkunde, scheikunde, biologie
- nederlands, engels, informatica

TOPIC GROUPS (choose based on subject):
Wiskunde: rekenen-getallen, algebra-vergelijkingen, functies-grafieken, meetkunde-ruimtelijk, analyse-calculus, kans-statistiek, verdieping-vwo
Economie: micro, macro, publiek-financien, persoonlijke-financien, internationaal, vaardigheden-modelleren
Natuurkunde: mechanica, elektriciteit-magnetisme, golf-optica, thermodynamica, moderne-fysica, metingen-vaardigheden
Scheikunde: materie-structuur, stoichiometrie, reacties, kinetiek-evenwicht, organische-chemie, analyse-vaardigheden
Biologie: cel-biochemie, genetica-evolutie, fysiologie-mens, ecologie, microbiologie-immuniteit, planten, bio-vaardigheden
Nederlands: lezen-luisteren, schrijven, taalbeschouwing-grammatica, literatuur, nl-vaardigheden
Engels: reading-listening, writing, speaking, grammar-vocabulary, literature-culture, exam-skills
Informatica: programmeren, web-databases, algoritmen, ethiek-veiligheid

TOPICS (choose specific topic from the topic group):
Examples: breuken-optellen, lineaire-vergelijking, pythagoras, differentiëren-somregel, vraag-en-aanbod, newton, zuur-base, dna-rna, etc.

LEVELS: po, vo-vmbo-bb, vo-vmbo-kb, vo-vmbo-gt, vo-havo-onderbouw, vo-vwo-onderbouw, vo-havo-bovenbouw, vo-vwo-bovenbouw, mbo, hbo-propedeuse, hbo-hoofdfase, wo-bachelor, wo-master, wo-phd, mixed

Return JSON with:
- subject: One of the subjects above
- topicGroup: One of the topic groups above (must match the subject)
- topic: Specific topic from the topic group
- level: Educational level from the list above
- schoolYear: School year in format "YYYY-YYYY" (e.g., "2024-2025")
- keywords: Array of 3-5 relevant keywords
- summary: Brief 1-sentence summary in Dutch
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
  private basicAnalysis(fileName: string): any {
    // Extract basic info from filename
    const yearMatch = fileName.match(/(\d{4})/);
    const schoolYear = yearMatch ? `${yearMatch[1]}-${parseInt(yearMatch[1]) + 1}` : undefined;
    
    return {
      subject: 'wiskunde-a',
      topicGroup: 'rekenen-getallen',
      topic: 'algemeen',
      level: 'vo-havo-onderbouw',
      schoolYear: schoolYear,
      keywords: [],
      summary: 'Document geanalyseerd op basis van bestandsnaam',
      summaryEn: 'Document analyzed based on filename',
      topicEn: 'general',
      keywordsEn: []
    };
  }
}

// Export singleton instance
export const datalakeService = new DatalakeService();

