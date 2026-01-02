/**
 * Datalake Service Cache Management
 */

const CACHE_DURATION_HOURS = parseInt(process.env.CACHE_DURATION_HOURS || '12');
const CACHE_KEY_STUDENTS = 'cached_students';
const CACHE_KEY_FILES = 'cached_files_';

// In-memory cache
const memoryCache = new Map<string, { data: Record<string, unknown>; timestamp: number }>();

export class DatalakeCache {
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

  // Generic cache methods
  get(key: string) {
    return this.getCache(key);
  }

  set(key: string, data: unknown) {
    this.setCache(key, data);
  }
}

