#!/usr/bin/env node

/**
 * Force re-analyze all notes directly (without API authentication)
 * Uses the background sync service directly
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });
config({ path: join(__dirname, '..', '.env') });

// Import the background sync service
// Note: This requires the app to be built or we need to use tsx/ts-node
async function main() {
  console.log('🔄 Starting direct force re-analysis...\n');
  
  try {
    console.log('📡 Calling background sync service directly...\n');
    
    // Create a temporary TypeScript file that calls the service
    const tempScript = `
import { backgroundSyncService } from './src/lib/background-sync';

async function run() {
  try {
    console.log('🔄 Starting force re-analysis...');
    await backgroundSyncService.forceReanalyzeAll();
    console.log('✅ Force re-analysis completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

run();
`;
    
    // Write temp script
    const fs = await import('fs/promises');
    const tempPath = join(__dirname, '..', '.temp-reanalyze.ts');
    await fs.writeFile(tempPath, tempScript, 'utf-8');
    
    // Run with tsx
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    console.log('🚀 Executing re-analysis...\n');
    const { stdout, stderr } = await execAsync(`npx tsx ${tempPath}`, {
      cwd: join(__dirname, '..'),
      env: process.env,
    });
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    // Cleanup
    await fs.unlink(tempPath).catch(() => {});
    
  } catch (error) {
    console.error('❌ Failed to run re-analysis:', error);
    console.log('\n💡 Alternative: Use the cron endpoint with CRON_SECRET');
    console.log('   curl -X GET http://localhost:3001/api/cron/sync-cache \\');
    console.log('     -H "Authorization: Bearer YOUR_CRON_SECRET"');
    process.exit(1);
  }
}

main();

