/**
 * Thumbnail Generator Service
 * Handles batch generation of thumbnails for PDFs in the datalake
 */

import pdf2pic from 'pdf2pic';
import { datalakeService } from './datalake-simple';
import { datalakeThumbnailService } from './datalake-thumbnails';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

interface ThumbnailGenerationResult {
  filePath: string;
  fileId: string;
  success: boolean;
  error?: string;
}

interface ThumbnailGenerationProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
}

type ProgressCallback = (progress: ThumbnailGenerationProgress) => void;

export class ThumbnailGeneratorService {
  private readonly batchSize: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(
    batchSize: number = 10,
    maxRetries: number = 2,
    retryDelay: number = 2000
  ) {
    this.batchSize = batchSize;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  /**
   * Check if thumbnail already exists for a file
   */
  async checkThumbnailExists(fileId: string, size: 'small' | 'medium' | 'large' = 'medium'): Promise<boolean> {
    try {
      return await datalakeThumbnailService.thumbnailExists(fileId, size);
    } catch (error) {
      console.error(`Error checking thumbnail existence for ${fileId}:`, error);
      return false;
    }
  }

  /**
   * Generate thumbnail for a single PDF file
   */
  async generateThumbnailForFile(
    filePath: string,
    fileId: string,
    size: 'small' | 'medium' | 'large' = 'medium',
    force: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    // Check if thumbnail already exists
    if (!force && await this.checkThumbnailExists(fileId, size)) {
      console.log(`⏭️  Thumbnail already exists for ${fileId}, skipping`);
      return { success: true };
    }

    let tempPdfPath: string | null = null;

    try {
      // Get file info from datalake
      const fileInfo = await datalakeService.getFileInfo(filePath);
      if (!fileInfo.success || !fileInfo.data) {
        return { success: false, error: 'File not found in datalake' };
      }

      // Check if file is a PDF
      if (!fileInfo.data.mimeType || !fileInfo.data.mimeType.includes('pdf')) {
        return { success: false, error: 'File is not a PDF' };
      }

      // Get download URL
      const downloadUrl = typeof fileInfo.data.downloadUrl === 'string' 
        ? fileInfo.data.downloadUrl 
        : String(fileInfo.data.downloadUrl);

      // Download the PDF file from datalake
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        return { success: false, error: `Failed to download PDF: ${response.status}` };
      }

      const pdfBuffer = await response.arrayBuffer();
      tempPdfPath = path.join('/tmp', `thumb_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);
      await writeFile(tempPdfPath, Buffer.from(pdfBuffer));

      // Configure pdf2pic based on size
      const sizeConfig = {
        small: { width: 200, height: 200 },
        medium: { width: 400, height: 400 },
        large: { width: 800, height: 800 }
      };

      const config = sizeConfig[size] || sizeConfig.medium;

      // Convert PDF to image
      const convert = pdf2pic.fromPath(tempPdfPath, {
        density: 100,
        saveFilename: 'page',
        savePath: '/tmp',
        format: 'png',
        width: config.width,
        height: config.height
      });

      const result = await convert(1, { responseType: 'base64' });
      
      if (!result || !result.base64) {
        return { success: false, error: 'Failed to generate thumbnail from PDF' };
      }

      // Convert to image buffer
      const imageBuffer = Buffer.from(result.base64, 'base64');
      
      // Store thumbnail in datalake
      await datalakeThumbnailService.storeThumbnail(fileId, imageBuffer, size);
      
      console.log(`✅ Thumbnail generated and stored for ${fileId}`);
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error generating thumbnail for ${fileId}:`, errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      // Clean up temporary file
      if (tempPdfPath) {
        try {
          await unlink(tempPdfPath);
        } catch (error) {
          console.error(`Failed to clean up temporary file ${tempPdfPath}:`, error);
        }
      }
    }
  }

  /**
   * Generate thumbnails for all PDFs in a student folder
   */
  async generateThumbnailsForStudent(
    studentPath: string,
    size: 'small' | 'medium' | 'large' = 'medium',
    force: boolean = false,
    onProgress?: ProgressCallback
  ): Promise<ThumbnailGenerationResult[]> {
    try {
      // Get all files for the student
      const files = await datalakeService.listFilesInFolder('', studentPath);
      
      // Filter for PDF files only
      const pdfFiles = files.filter(file => 
        file.mimeType && file.mimeType.includes('pdf')
      );

      console.log(`📚 Found ${pdfFiles.length} PDF files for student ${studentPath}`);

      const results: ThumbnailGenerationResult[] = [];
      let processed = 0;
      let successful = 0;
      let failed = 0;
      let skipped = 0;

      // Process in batches
      for (let i = 0; i < pdfFiles.length; i += this.batchSize) {
        const batch = pdfFiles.slice(i, i + this.batchSize);
        
        const batchPromises = batch.map(async (file) => {
          const filePath = file.id || file.name;
          const fileId = filePath; // Use full path as fileId
          
          // Check if thumbnail exists (unless force)
          if (!force && await this.checkThumbnailExists(fileId, size)) {
            skipped++;
            return {
              filePath,
              fileId,
              success: true
            };
          }

          // Generate thumbnail with retry logic
          let lastError: string | undefined;
          for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            if (attempt > 0) {
              console.log(`🔄 Retry attempt ${attempt} for ${fileId}`);
              await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            }

            const result = await this.generateThumbnailForFile(filePath, fileId, size, force);
            
            if (result.success) {
              successful++;
              return {
                filePath,
                fileId,
                success: true
              };
            }
            
            lastError = result.error;
          }

          // All retries failed
          failed++;
          return {
            filePath,
            fileId,
            success: false,
            error: lastError
          };
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        processed += batch.length;

        // Report progress
        if (onProgress) {
          onProgress({
            total: pdfFiles.length,
            processed,
            successful,
            failed,
            skipped
          });
        }

        // Small delay between batches to avoid overwhelming the system
        if (i + this.batchSize < pdfFiles.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log(`✅ Completed thumbnail generation for ${studentPath}: ${successful} successful, ${failed} failed, ${skipped} skipped`);
      return results;

    } catch (error) {
      console.error(`❌ Error generating thumbnails for student ${studentPath}:`, error);
      throw error;
    }
  }

  /**
   * Generate thumbnails for all students
   */
  async generateThumbnailsForAllStudents(
    size: 'small' | 'medium' | 'large' = 'medium',
    force: boolean = false,
    onProgress?: ProgressCallback
  ): Promise<{ student: string; results: ThumbnailGenerationResult[] }[]> {
    try {
      // Get all students from datalake
      const students = await datalakeService.getAllStudentFolders();
      console.log(`📚 Found ${students.length} students to process`);

      const allResults: { student: string; results: ThumbnailGenerationResult[] }[] = [];

      for (const student of students) {
        console.log(`🔄 Processing thumbnails for student: ${student.name}`);
        
        const results = await this.generateThumbnailsForStudent(
          student.id,
          size,
          force,
          onProgress
        );

        allResults.push({
          student: student.name,
          results
        });
      }

      return allResults;

    } catch (error) {
      console.error('❌ Error generating thumbnails for all students:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const thumbnailGeneratorService = new ThumbnailGeneratorService();



