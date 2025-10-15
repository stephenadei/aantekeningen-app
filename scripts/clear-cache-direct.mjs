import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(projectRoot, '.env.local') });
dotenv.config({ path: path.resolve(projectRoot, '.env') });

// Import the Google Drive service
import { googleDriveService } from '../src/lib/google-drive-simple.ts';

async function clearCache() {
  try {
    console.log('🧹 Clearing Google Drive cache...');
    
    const result = googleDriveService.clearCache();
    
    if (result.success) {
      console.log('✅ ' + result.message);
    } else {
      console.log('❌ ' + result.message);
    }
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
  }
}

clearCache();
