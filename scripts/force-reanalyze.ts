/**
 * Force re-analyze all notes directly
 * Run with: npx tsx scripts/force-reanalyze.ts
 */

import { backgroundSyncService } from '../src/lib/background-sync';

async function main() {
  try {
    console.log('🔄 Starting force re-analysis for all students...\n');
    await backgroundSyncService.forceReanalyzeAll();
    console.log('\n✅ Force re-analysis completed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during re-analysis:', error);
    process.exit(1);
  }
}

main();

