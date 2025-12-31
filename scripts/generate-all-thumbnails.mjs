#!/usr/bin/env node

/**
 * Generate thumbnails for all PDFs in the datalake
 * This script triggers thumbnail generation for all students via the API
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });
config({ path: join(__dirname, '..', '.env') });

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXTAUTH_URL || 'http://localhost:3001';
const CRON_SECRET = process.env.CRON_SECRET || 'test-secret';

/**
 * Make API request
 */
async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`,
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Request failed:`, error.message);
    throw error;
  }
}

/**
 * Generate thumbnails for all students
 */
async function generateAllThumbnails(size = 'medium', force = false) {
  console.log('🖼️  Starting thumbnail generation for all PDFs in datalake...');
  console.log(`   Size: ${size}`);
  console.log(`   Force: ${force ? 'Yes (regenerate existing)' : 'No (skip existing)'}`);
  console.log(`   API URL: ${API_BASE_URL}`);
  console.log('');

  try {
    // Trigger thumbnail generation via API
    console.log('📡 Triggering thumbnail generation via API...');
    const result = await makeRequest(`/api/cron/generate-thumbnails?size=${size}&force=${force}`);

    console.log('✅ Thumbnail generation started successfully!');
    console.log('📊 Response:', JSON.stringify(result, null, 2));
    console.log('\n💡 Note: This runs in the background. Check the API logs for progress.');
    console.log(`   Started at: ${new Date().toISOString()}`);
    console.log('\n📝 To check progress, monitor the Docker logs:');
    console.log('   docker compose logs -f app | grep thumbnail');

  } catch (error) {
    console.error('\n❌ Thumbnail generation failed:', error);
    console.log('\n💡 Make sure:');
    console.log('   1. The app is running and accessible at:', API_BASE_URL);
    console.log('   2. CRON_SECRET is set correctly in .env.local');
    console.log('   3. The API endpoint is accessible');
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let size = 'medium';
let force = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--size' && args[i + 1]) {
    size = args[i + 1];
    if (!['small', 'medium', 'large'].includes(size)) {
      console.error('❌ Invalid size. Must be: small, medium, or large');
      process.exit(1);
    }
    i++;
  } else if (args[i] === '--force') {
    force = true;
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log('Usage:');
    console.log('  node scripts/generate-all-thumbnails.mjs [--size small|medium|large] [--force]');
    console.log('');
    console.log('Options:');
    console.log('  --size <size>      Thumbnail size: small, medium (default), or large');
    console.log('  --force            Regenerate thumbnails even if they already exist');
    console.log('  --help, -h         Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/generate-all-thumbnails.mjs');
    console.log('  node scripts/generate-all-thumbnails.mjs --size large');
    console.log('  node scripts/generate-all-thumbnails.mjs --force');
    console.log('  node scripts/generate-all-thumbnails.mjs --size large --force');
    console.log('');
    console.log('Note: This script requires the app to be running.');
    console.log('      Set NEXT_PUBLIC_API_URL or NEXTAUTH_URL environment variable if needed.');
    console.log('      Set CRON_SECRET in .env.local for authentication.');
    process.exit(0);
  }
}

// Run thumbnail generation
generateAllThumbnails(size, force).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

