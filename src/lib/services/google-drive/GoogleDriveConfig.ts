/**
 * Google Drive Service Configuration
 */

export const NOTABILITY_FOLDER_NAME = 'Notability';
export const PRIVELES_FOLDER_NAME = 'Priveles';

export const CACHE_DURATION_HOURS = parseInt(process.env.CACHE_DURATION_HOURS || '12');
export const METADATA_CACHE_DURATION_HOURS = 12;
export const METADATA_CACHE_DURATION_MS = METADATA_CACHE_DURATION_HOURS * 60 * 60 * 1000;

