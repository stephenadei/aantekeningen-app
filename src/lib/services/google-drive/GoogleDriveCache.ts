/**
 * Google Drive Service Cache Management
 */

const CACHE_DURATION_HOURS = parseInt(process.env.CACHE_DURATION_HOURS || '12');
const METADATA_CACHE_DURATION_HOURS = 12;
const METADATA_CACHE_DURATION_MS = METADATA_CACHE_DURATION_HOURS * 60 * 60 * 1000;

const CACHE_KEY_STUDENTS = 'cached_students';
const CACHE_KEY_FILES = 'cached_files_';
const CACHE_KEY_AI_ANALYSIS = 'cached_ai_analysis_';
const CACHE_KEY_METADATA = 'cached_metadata';

// In-memory cache (in production, consider using Redis)
const memoryCache = new Map<string, { data: Record<string, unknown>; timestamp: number }>();

export class GoogleDriveCache {
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

  private setCache(key: string, data: unknown) {
    memoryCache.set(key, {
      data: data as Record<string, unknown>,
      timestamp: new Date().getTime()
    });
  }

  getStudentsCache() {
    return this.getCache(CACHE_KEY_STUDENTS);
  }

  setStudentsCache(data: unknown) {
    this.setCache(CACHE_KEY_STUDENTS, data);
  }

  getFilesCache(folderId: string) {
    return this.getCache(`${CACHE_KEY_FILES}${folderId}`);
  }

  setFilesCache(folderId: string, data: unknown) {
    this.setCache(`${CACHE_KEY_FILES}${folderId}`, data);
  }

  getAIAnalysisCache(fileId: string) {
    return this.getCache(`${CACHE_KEY_AI_ANALYSIS}${fileId}`);
  }

  setAIAnalysisCache(fileId: string, data: unknown) {
    this.setCache(`${CACHE_KEY_AI_ANALYSIS}${fileId}`, data);
  }

  getMetadataCache() {
    return this.getCache(CACHE_KEY_METADATA);
  }

  setMetadataCache(data: unknown) {
    this.setCache(CACHE_KEY_METADATA, data);
  }

  isMetadataCacheValid(): boolean {
    const cached = memoryCache.get(CACHE_KEY_METADATA);
    if (!cached) return false;
    
    const age = Date.now() - cached.timestamp;
    return age < METADATA_CACHE_DURATION_MS;
  }

  // Generic cache methods for flexibility
  get(key: string) {
    return this.getCache(key);
  }

  set(key: string, data: unknown) {
    this.setCache(key, data);
  }
}

