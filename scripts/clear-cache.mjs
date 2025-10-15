import { googleDriveService } from '../src/lib/google-drive-simple.ts';

async function clearCache() {
  console.log('🗑️  Clearing Google Drive cache...');
  
  try {
    const result = googleDriveService.clearCache();
    console.log('✅ Cache cleared:', result.message);
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
  }
}

clearCache()
  .then(() => console.log('🏁 Cache clearing completed'))
  .catch((e) => console.error('❌ Cache clearing failed:', e));
