import * as MinIO from 'minio';
import { createMinioClient, getMinioConfig } from '@stephen/datalake';
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
import { MedallionBuckets } from '@stephen/datalake';
import { extractDateFromTitle } from './date-extractor';

// Datalake configuration - Bronze layer for raw PDFs
const BUCKET_NAME = MedallionBuckets.BRONZE_EDUCATION;
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
  private internalEndpoint: string | null = null;

  /**
   * Transform presigned URL to use public endpoint if needed
   */
  private transformPresignedUrl(url: string): string {
    if (!this.presignedEndpoint) {
      return url;
    }
    
    // Replace internal endpoint with public endpoint in the URL
    try {
      const urlObj = new URL(url);
      const publicUrlObj = new URL(this.presignedEndpoint);
      
      // Replace hostname and protocol
      urlObj.hostname = publicUrlObj.hostname;
      urlObj.protocol = publicUrlObj.protocol;
      
      // Always remove port for standard ports (80 for http, 443 for https)
      // Nginx reverse proxy handles the routing
      const standardPort = publicUrlObj.protocol === 'https:' ? 443 : 80;
      const currentPort = urlObj.port ? parseInt(urlObj.port) : (urlObj.protocol === 'https:' ? 443 : 80);
      
      // Remove port if it's standard or if it's 9000 (internal MinIO port)
      if (currentPort === standardPort || currentPort === 9000) {
        urlObj.port = '';
      }
      
      return urlObj.toString();
    } catch (error) {
      console.error('Error transforming presigned URL:', error);
      return url;
    }
  }

  constructor() {
    this.initializeMinIO();
  }

  private initializeMinIO() {
    try {
      if (typeof window !== 'undefined') {
        throw new Error('MinIO client can only be used server-side');
      }

      // Use shared utility for base config and internal client
      const baseConfig = getMinioConfig();
      const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
      const publicEndpoint = process.env.MINIO_PUBLIC_ENDPOINT || process.env.MINIO_ENDPOINT || 'localhost';
      
      // Create internal client for operations using shared utility
      this.minioClient = createMinioClient();
      
      // Extract internal connection details for presigned URL logic
      const internalHostname = baseConfig.endPoint;
      const internalPort = baseConfig.port;

      // Create separate client for presigned URLs with public endpoint
      // This ensures presigned URLs have correct signature for public domain
      // Use MINIO_PUBLIC_ENDPOINT if set, otherwise try to detect from MINIO_ENDPOINT
      const publicHostname = publicEndpoint.replace(/^https?:\/\//, '').split(':')[0].split('/')[0];
      const isDockerContainerName = !publicHostname.includes('.') && publicHostname !== 'localhost' && !publicHostname.includes('127.0.0.1');
      
      if (isDockerContainerName) {
        // If it's a Docker container name (like 'platform-minio'), we need a public endpoint
        // Check if MINIO_PUBLIC_ENDPOINT is set
        if (process.env.MINIO_PUBLIC_ENDPOINT) {
          const publicUrl = process.env.MINIO_PUBLIC_ENDPOINT;
          const publicUrlObj = new URL(publicUrl.startsWith('http') ? publicUrl : `https://${publicUrl}`);
          // For presigned URLs, always use the public endpoint without port (Nginx handles routing)
          // The signature is generated with internal endpoint, but URL is transformed to public
          this.presignedEndpoint = `${publicUrlObj.protocol}//${publicUrlObj.hostname}`;
          
          // For presigned URLs, we need to connect to internal MinIO for signature generation
          // But the URL will be transformed to use the public endpoint
          // MinIO signatures are based on the endpoint used in the client, so we connect internally
          this.presignedClient = new MinIO.Client({
            endPoint: internalHostname, // Connect internally for signature generation
            port: internalPort, // Use internal port
            useSSL: false, // Internal connection is always HTTP
            accessKey: baseConfig.accessKey,
            secretKey: baseConfig.secretKey,
          });
          
          this.internalEndpoint = `http://${internalHostname}:${internalPort}`;
          console.log(`✅ MinIO client initialized (presigned URLs will use: ${this.presignedEndpoint})`);
        } else {
          // Fallback: use localhost but warn
          this.presignedClient = new MinIO.Client({
            endPoint: 'localhost',
            port: internalPort,
            useSSL: false,
            accessKey: baseConfig.accessKey,
            secretKey: baseConfig.secretKey,
          });
          console.log('⚠️  MinIO endpoint is a Docker container name but MINIO_PUBLIC_ENDPOINT is not set.');
          console.log('   Presigned URLs will use localhost. Set MINIO_PUBLIC_ENDPOINT for production.');
          this.presignedEndpoint = null;
          this.internalEndpoint = null;
        }
      } else if (publicEndpoint !== 'localhost' && !publicEndpoint.includes('127.0.0.1')) {
        // Extract hostname from public endpoint (remove protocol if present)
        const protocol = publicEndpoint.includes('https://') ? 'https' : (baseConfig.useSSL ? 'https' : 'http');
        // For presigned URLs, always use public endpoint without port (Nginx handles routing)
        this.presignedEndpoint = `${protocol}://${publicHostname}`;
        this.internalEndpoint = `http://${internalHostname}:${internalPort}`;
        
        // Create presigned client connecting internally (for signature generation)
        // URL will be transformed to use public endpoint
        this.presignedClient = new MinIO.Client({
          endPoint: internalHostname, // Connect internally for signature
          port: internalPort, // Use internal port
          useSSL: false, // Internal connection is always HTTP
          accessKey: baseConfig.accessKey,
          secretKey: baseConfig.secretKey,
        });
        
        console.log(`✅ MinIO client initialized (presigned URLs will use: ${this.presignedEndpoint})`);
      } else {
        this.presignedEndpoint = null;
        this.presignedClient = this.minioClient; // Use same client if no public endpoint
        console.log('✅ MinIO client initialized (using localhost for presigned URLs)');
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
   * Find students with calendar events in MinIO datalake
   * Searches in calendar/events/{studentName}/ folders
   * @param query Search query (use '*' or '' to find all students)
   */
  async findStudentsWithCalendarEvents(query: string): Promise<Array<{ name: string; calendarPath: string }>> {
    try {
      await this.ensureInitialized();
      
      const calendarPrefix = 'calendar/events/';
      const queryLower = query === '*' || query === '' ? '' : query.toLowerCase();
      const students: Array<{ name: string; calendarPath: string }> = [];
      const studentNames = new Set<string>();
      
      try {
        const objectsStream = this.minioClient.listObjects(BUCKET_NAME, calendarPrefix, true);
        
        for await (const obj of objectsStream) {
          if (obj.name && obj.name.startsWith(calendarPrefix)) {
            // Extract student name from path: calendar/events/StudentName/2024-01.json
            const relativePath = obj.name.substring(calendarPrefix.length);
            const parts = relativePath.split('/').filter((p: string) => p.length > 0);
            
            if (parts.length > 0) {
              const studentName = parts[0];
              
              // Check if name matches query (or if query is empty/wildcard) and we haven't added this student yet
              const matches = queryLower === '' || studentName.toLowerCase().includes(queryLower);
              
              if (matches && !studentNames.has(studentName)) {
                studentNames.add(studentName);
                students.push({
                  name: studentName,
                  calendarPath: `${calendarPrefix}${studentName}/`
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error listing calendar events:', error);
        // Return empty array on error, don't throw
      }
      
      return students;
    } catch (error) {
      console.error('Error finding students with calendar events:', error);
      return [];
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

      console.log(`📂 Listing files in folder: ${folderPath}`);

      const cacheKey = CACHE_KEY_FILES + folderPath;
      const cachedData = this.getCache(cacheKey);
      
      if (cachedData) {
        console.log(`✅ Cache hit for ${folderPath}: ${(cachedData.files as FileInfo[]).length} files`);
        return cachedData.files as FileInfo[];
      }

      // Normalize folder path (remove leading/trailing slashes, ensure it ends with /)
      const normalizedPath = folderPath.replace(/^\/+|\/+$/g, '');
      const prefix = normalizedPath.endsWith('/') ? normalizedPath : `${normalizedPath}/`;
      
      console.log(`🔍 MinIO listObjects: bucket="${BUCKET_NAME}", prefix="${prefix}"`);

      const files: FileInfo[] = [];
      const objectsStream = this.minioClient.listObjects(BUCKET_NAME, prefix, false);

      // Add timeout wrapper - check timeout during iteration
      const TIMEOUT_MS = 30000; // 30 seconds
      const startTime = Date.now();
      
      try {
        for await (const obj of objectsStream) {
          // Check if we've exceeded timeout
          if (Date.now() - startTime > TIMEOUT_MS) {
            throw new Error('Timeout: listObjects took too long (30s)');
          }
          
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

          // Use download proxy endpoint instead of presigned URL to avoid signature issues
          const downloadProxyUrl = `/api/download/${encodeURIComponent(obj.name)}`;

          // Extract metadata from file name and path
          const cleanFileName = fileName.replace(/\.(pdf|note|notability)$/i, '');
          
          // Extract subject from path
          const pathParts = obj.name.split('/').filter((p: string) => p);
          let subject: Subject | undefined;
          if (pathParts.length >= 2) {
            const subjectFolder = pathParts[pathParts.length - 2]; // Second to last is subject folder
            if (subjectFolder === 'VO' || subjectFolder === 'WO') {
              subject = 'wiskunde-a';
            } else if (subjectFolder === 'Rekenen') {
              subject = 'rekenen-basis';
            }
          }

            // Get thumbnail URL from datalake (if available)
            let thumbnailUrl = '';
            try {
              const { datalakeThumbnailService } = await import('./datalake-thumbnails');
              const datalakeThumbnail = await datalakeThumbnailService.getThumbnailUrl(obj.name, 'medium');
              if (datalakeThumbnail) {
                // Use API endpoint instead of direct presigned URL for better caching
                thumbnailUrl = `/api/thumbnail/${encodeURIComponent(obj.name)}?size=medium`;
              }
            } catch (error) {
              // Thumbnail not available, use empty string
            }

            // Extract date from filename/title
            const dateFromTitle = extractDateFromTitle(cleanFileName);

            // Try to get PDF creation date from metadata file (if available)
            let pdfCreationDate: Date | null = null;
            if (fileName.toLowerCase().endsWith('.pdf')) {
              try {
                const { datalakeMetadataService } = await import('./datalake-metadata');
                const metadata = await datalakeMetadataService.getFileMetadata(obj.name);
                if (metadata?.createdAt) {
                  // Use createdAt from metadata as PDF creation date
                  const parsed = new Date(metadata.createdAt);
                  if (!isNaN(parsed.getTime())) {
                    pdfCreationDate = parsed;
                  }
                }
              } catch (error) {
                // Metadata not available or error reading - that's okay
                // We'll fall back to dateFromTitle or modifiedTime
              }
            }

            const fileInfo: FileInfo = {
              id: createDriveFileId(obj.name),
              name: createFileName(fileName),
              title: createCleanFileName(cleanFileName),
              url: createDriveUrl(`/${BUCKET_NAME}/${obj.name}`),
              downloadUrl: createDownloadUrl(downloadProxyUrl),
              viewUrl: createViewUrl(downloadProxyUrl), // Use proxy for viewing too
              thumbnailUrl: thumbnailUrl ? createThumbnailUrl(thumbnailUrl) : createThumbnailUrl(''),
              modifiedTime: obj.lastModified?.toISOString() || new Date().toISOString(),
              size: obj.size || 0,
              mimeType: this.getMimeType(fileName),
              subject,
              dateFromTitle: dateFromTitle || null,
              pdfCreationDate: pdfCreationDate || null,
            };

          files.push(fileInfo);
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Timeout')) {
          console.error('❌ Timeout listing files:', error.message);
          throw error;
        }
        throw error;
      }

      // Filter out .note files if matching PDF exists
      const fileNames = files.map(f => f.name);
      const filteredFiles = files.filter(file => {
        // Filter out .metadata.json files
        if (file.name.endsWith('.metadata.json')) {
          return false;
        }
        
        // Filter out .note files if matching PDF exists
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
   * Upload a file to the datalake
   */
  async uploadFile(path: string, buffer: Buffer, contentType: string = 'application/pdf'): Promise<void> {
    try {
      await this.ensureInitialized();
      await this.minioClient.putObject(BUCKET_NAME, path, buffer, buffer.length, {
        'Content-Type': contentType
      });
      console.log(`✅ Uploaded file to ${path}`);
    } catch (error) {
      console.error(`❌ Error uploading file to ${path}:`, error);
      throw error;
    }
  }

  /**
   * Download a file directly from MinIO as a Buffer
   * Used for thumbnail generation and other processing
   */
  async downloadFileAsBuffer(filePath: string): Promise<Buffer> {
    try {
      await this.ensureInitialized();
      
      const stream = await this.minioClient.getObject(BUCKET_NAME, filePath);
      const chunks: Buffer[] = [];
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      console.error(`❌ Error downloading file ${filePath}:`, error);
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

      let subject: Subject | undefined;
      if (filePath.includes("/VO/") || filePath.includes("/WO/")) {
        subject = createSubject("wiskunde-a");
      } else if (filePath.includes("/Rekenen/")) {
        subject = createSubject("rekenen");
      }

      // Get thumbnail URL from datalake (if available)
      let thumbnailUrl = '';
      try {
        const { datalakeThumbnailService } = await import('./datalake-thumbnails');
        const datalakeThumbnail = await datalakeThumbnailService.getThumbnailUrl(filePath, 'medium');
        if (datalakeThumbnail) {
          // Use API endpoint instead of direct presigned URL for better caching
          thumbnailUrl = `/api/thumbnail/${encodeURIComponent(filePath)}?size=medium`;
        }
      } catch (error) {
        // Thumbnail not available, use empty string
      }

      // Use download proxy endpoint instead of presigned URL to avoid signature issues
      const downloadProxyUrl = `/api/download/${encodeURIComponent(filePath)}`;

      const fileInfo: FileInfo = {
        id: createDriveFileId(filePath),
        name: createFileName(fileName),
        title: createCleanFileName(cleanFileName),
        url: createDriveUrl(`/${BUCKET_NAME}/${filePath}`),
        downloadUrl: createDownloadUrl(downloadProxyUrl),
        viewUrl: createViewUrl(downloadProxyUrl), // Use proxy for viewing too
        thumbnailUrl: thumbnailUrl ? createThumbnailUrl(thumbnailUrl) : createThumbnailUrl(''),
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
      
      // Load taxonomy dynamically
      const { TaxonomyService } = await import('@stephen/taxonomy');
      const taxonomyService = new TaxonomyService();
      const taxonomy = await taxonomyService.getTaxonomyData();
      
      // Build dynamic taxonomy prompt from loaded data
      const subjectsList = taxonomy.subjects.map((s: { name: string }) => s.name).join(', ');
      
      // Group topic groups by subject
      const topicGroupsBySubject: Record<string, string[]> = {};
      for (const tg of taxonomy.topicGroups) {
        if (!topicGroupsBySubject[tg.subjectId]) {
          topicGroupsBySubject[tg.subjectId] = [];
        }
        topicGroupsBySubject[tg.subjectId].push(tg.name);
      }
      
      // Build topic groups section
      let topicGroupsSection = '';
      for (const subject of taxonomy.subjects) {
        const subjectDisplayName = subject.displayName || subject.name;
        const topicGroups = topicGroupsBySubject[subject.id] || [];
        if (topicGroups.length > 0) {
          topicGroupsSection += `${subjectDisplayName}: ${topicGroups.join(', ')}\n`;
        }
      }
      
      // Get example topics
      const exampleTopics = taxonomy.topics.slice(0, 10).map((t: { name: string }) => t.name).join(', ');
      
      // Prepare prompt for OpenAI with dynamic taxonomy
      const prompt = `Analyze this educational document and extract metadata. Return a JSON object with:

SUBJECTS (choose the most appropriate):
${subjectsList}

TOPIC GROUPS (choose based on subject):
${topicGroupsSection}

TOPICS (choose specific topic from the topic group):
Examples: ${exampleTopics}, etc. Use topics that belong to the selected topic group.

LEVELS: po, vo-vmbo-bb, vo-vmbo-kb, vo-vmbo-gt, vo-havo-onderbouw, vo-vwo-onderbouw, vo-havo-bovenbouw, vo-vwo-bovenbouw, mbo, hbo-propedeuse, hbo-hoofdfase, wo-bachelor, wo-master, wo-phd, mixed

Return JSON with:
- subject: One of the subjects above (use the exact subject name/ID)
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
      let analysis = JSON.parse(responseData.choices[0].message.content);
      
      // Resolve synonyms using taxonomy service
      if (analysis.subject) {
        const resolvedSubjectId = await taxonomyService.resolveSubject(analysis.subject);
        if (resolvedSubjectId) {
          const subject = taxonomy.subjects.find((s: { id: string; name: string }) => s.id === resolvedSubjectId);
          if (subject) {
            analysis.subject = subject.name; // Use canonical subject name
          }
        }
      }
      
      if (analysis.topicGroup) {
        const resolvedTopicGroupId = await taxonomyService.resolveTopicGroup(analysis.topicGroup);
        if (resolvedTopicGroupId) {
          const topicGroup = taxonomy.topicGroups.find((tg: { id: string; name: string }) => tg.id === resolvedTopicGroupId);
          if (topicGroup) {
            analysis.topicGroup = topicGroup.name; // Use canonical topic group name
          }
        }
      }
      
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

