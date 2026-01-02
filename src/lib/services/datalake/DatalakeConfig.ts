/**
 * Datalake Service Configuration
 */

import { MedallionBuckets } from '@stephen/datalake';

export const BUCKET_NAME = MedallionBuckets.BRONZE_EDUCATION;
export const BASE_PATH = 'notability/Priveles';
export const CACHE_DURATION_HOURS = parseInt(process.env.CACHE_DURATION_HOURS || '12');

