#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env.local');

console.log('🔧 Fixing environment configuration for port 3000...\n');

try {
  // Read current .env.local
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update the values to port 3000
  envContent = envContent.replace(
    /GOOGLE_REDIRECT_URI=.*/,
    'GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google'
  );
  
  envContent = envContent.replace(
    /NEXTAUTH_URL=.*/,
    'NEXTAUTH_URL=http://localhost:3000'
  );
  
  // Write back to file
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ Environment configuration updated!');
  console.log('📋 Changes made:');
  console.log('   - GOOGLE_REDIRECT_URI: Updated to port 3000');
  console.log('   - NEXTAUTH_URL: Updated to port 3000');
  
  console.log('\n🔧 Next steps:');
  console.log('1. Update Google OAuth Console with: http://localhost:3000/api/auth/callback/google');
  console.log('2. Restart your development server');
  console.log('3. Test the admin login');
  
} catch (error) {
  console.error('❌ Error updating environment:', error.message);
  process.exit(1);
}
