/**
 * Seed Taxonomy Script
 * 
 * Converts hardcoded taxonomy.ts to new unified taxonomy format
 * and saves it to datalake, then syncs to database
 */

import { createMinioClient } from '@stephen/datalake';
import { MedallionBuckets } from '@stephen/datalake';
import * as Minio from 'minio';

// Import taxonomy data (we'll need to convert this)
// For now, we'll create a basic structure

const TAXONOMY_BASE_PATH = 'taxonomy';
const TAXONOMY_FILES = {
  subjects: `${TAXONOMY_BASE_PATH}/subjects.json`,
  topicGroups: `${TAXONOMY_BASE_PATH}/topic-groups.json`,
  topics: `${TAXONOMY_BASE_PATH}/topics.json`,
  synonyms: `${TAXONOMY_BASE_PATH}/synonyms.json`,
  metadata: `${TAXONOMY_BASE_PATH}/metadata.json`,
};

// Basic taxonomy structure - this should be populated from taxonomy.ts
// For now, creating a minimal structure that can be expanded
const initialTaxonomy = {
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  subjects: [],
  topicGroups: [],
  topics: [],
  synonyms: {
    subjects: {},
    topicGroups: {},
  },
};

async function seedTaxonomy() {
  try {
    const client = createMinioClient();
    const bucket = MedallionBuckets.SILVER_EDUCATION;

    // Ensure bucket exists
    const exists = await client.bucketExists(bucket);
    if (!exists) {
      await client.makeBucket(bucket, 'us-east-1');
    }

    // Save metadata
    const metadata = {
      version: initialTaxonomy.version,
      lastUpdated: initialTaxonomy.lastUpdated,
    };
    await saveJson(client, bucket, TAXONOMY_FILES.metadata, metadata);

    // Save all components
    await Promise.all([
      saveJson(client, bucket, TAXONOMY_FILES.subjects, initialTaxonomy.subjects),
      saveJson(client, bucket, TAXONOMY_FILES.topicGroups, initialTaxonomy.topicGroups),
      saveJson(client, bucket, TAXONOMY_FILES.topics, initialTaxonomy.topics),
      saveJson(client, bucket, TAXONOMY_FILES.synonyms, initialTaxonomy.synonyms),
    ]);

    console.log('✅ Taxonomy seeded to datalake');
    console.log('📝 Next step: Run sync from admin UI or API to populate database');
  } catch (error) {
    console.error('❌ Error seeding taxonomy:', error);
    process.exit(1);
  }
}

async function saveJson(client, bucket, path, data) {
  const content = JSON.stringify(data, null, 2);
  const buffer = Buffer.from(content, 'utf-8');
  
  await client.putObject(
    bucket,
    path,
    buffer,
    buffer.length,
    {
      'Content-Type': 'application/json',
    }
  );
}

seedTaxonomy();

