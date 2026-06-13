/**
 * Datalake Service Configuration
 * Uses DATALAKE_BUCKET when set (S3); otherwise legacy Medallion bucket name.
 */

import { MedallionBuckets } from '@stephenadei/datalake';

export const BUCKET_NAME = process.env.DATALAKE_BUCKET || MedallionBuckets.BRONZE_EDUCATION;
export const BASE_PATH = 'notability/Priveles';
export const CACHE_DURATION_HOURS = parseInt(process.env.CACHE_DURATION_HOURS || '12');

