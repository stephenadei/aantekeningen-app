#!/usr/bin/env node
/**
 * Regenerate AI Data
 * Re-analyzes all files in the datalake with AI
 */

/**
 * Regenerate AI Data
 * Triggers background sync via API endpoint
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const CRON_SECRET = process.env.CRON_SECRET || '';

async function regenerateAIData(forceReanalyze = true) {
  console.log('🔄 Starting AI Data Regeneration...\n');
  console.log(`Using API: ${API_BASE_URL}`);
  console.log(`Mode: ${forceReanalyze ? 'FORCE RE-ANALYZE (all files)' : 'Only missing files'}\n`);

  try {
    // Trigger background sync via API
    const syncUrl = `${API_BASE_URL}/api/cron/sync-cache`;
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add authorization if CRON_SECRET is set
    if (CRON_SECRET) {
      headers['Authorization'] = `Bearer ${CRON_SECRET}`;
    }

    console.log('🔄 Triggering background sync...\n');
    const response = await fetch(syncUrl, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sync failed: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Sync triggered:', result);

    console.log('\n✅ AI Data regeneration complete!');
    console.log('\n💡 Tip: Run check-ai-data-status.mjs to verify the results');

  } catch (error) {
    console.error('❌ Error regenerating AI data:', error);
    throw error;
  }
}

// Parse command line arguments
const forceReanalyze = process.argv.includes('--force') || process.argv.includes('-f');

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  regenerateAIData(forceReanalyze)
    .then(() => {
      console.log('\n✅ Regeneration complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}

export { regenerateAIData };

