#!/usr/bin/env node

/**
 * Firebase Setup Script
 * 
 * Dit script helpt je met het opzetten van Firebase zonder service account keys
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔥 Firebase Setup Script');
console.log('========================\n');

// Check if Firebase CLI is installed
function checkFirebaseCLI() {
  try {
    execSync('firebase --version', { stdio: 'ignore' });
    console.log('✅ Firebase CLI is geïnstalleerd');
    return true;
  } catch (error) {
    console.log('❌ Firebase CLI is niet geïnstalleerd');
    console.log('📦 Installeer het met: npm install -g firebase-tools');
    return false;
  }
}

// Check if user is logged in
function checkFirebaseLogin() {
  try {
    const result = execSync('firebase projects:list', { stdio: 'pipe' });
    console.log('✅ Je bent ingelogd bij Firebase');
    return true;
  } catch (error) {
    console.log('❌ Je bent niet ingelogd bij Firebase');
    console.log('🔐 Login met: firebase login');
    return false;
  }
}

// Get Firebase project info
function getFirebaseProjectInfo() {
  try {
    const result = execSync('firebase use', { stdio: 'pipe' });
    const output = result.toString();
    const match = output.match(/Active Project: (.+)/);
    if (match) {
      console.log(`✅ Actief project: ${match[1]}`);
      return match[1];
    }
  } catch (error) {
    console.log('❌ Geen actief Firebase project');
    console.log('🎯 Selecteer een project met: firebase use your-project-id');
  }
  return null;
}

// Create .env.local template
function createEnvTemplate(projectId) {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env.local bestaat al - maak een backup');
    const backupPath = `${envPath}.backup.${Date.now()}`;
    fs.copyFileSync(envPath, backupPath);
    console.log(`📋 Backup gemaakt: ${backupPath}`);
  }

  const envTemplate = `# Firebase Configuration (Server-side - Application Default Credentials)
FIREBASE_PROJECT_ID=${projectId || 'your-project-id'}

# Firebase Client Configuration (voor frontend)
# Haal deze waarden uit Firebase Console > Project Settings > General
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${projectId || 'your-project-id'}.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${projectId || 'your-project-id'}

# Bestaande Google Drive configuratie (blijft hetzelfde)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000
GOOGLE_REFRESH_TOKEN=your_refresh_token

# Bestaande configuratie (blijft hetzelfde)
NEXTAUTH_SECRET=your_nextauth_secret
OPENAI_API_KEY=your_openai_api_key

# Cache duration (optioneel, default: 12 uur)
CACHE_DURATION_HOURS=12
`;

  fs.writeFileSync(envPath, envTemplate);
  console.log('📝 .env.local template aangemaakt');
  console.log('🔧 Vul de ontbrekende waarden in (API keys, etc.)');
}

// Main setup function
async function setupFirebase() {
  console.log('🔍 Controleer Firebase setup...\n');

  // Check Firebase CLI
  if (!checkFirebaseCLI()) {
    console.log('\n❌ Setup gestopt. Installeer eerst Firebase CLI.');
    process.exit(1);
  }

  // Check login
  if (!checkFirebaseLogin()) {
    console.log('\n❌ Setup gestopt. Login eerst bij Firebase.');
    process.exit(1);
  }

  // Get project info
  const projectId = getFirebaseProjectInfo();
  
  if (!projectId) {
    console.log('\n❌ Setup gestopt. Selecteer eerst een Firebase project.');
    process.exit(1);
  }

  // Create env template
  createEnvTemplate(projectId);

  console.log('\n🎉 Firebase setup voltooid!');
  console.log('\n📋 Volgende stappen:');
  console.log('1. Vul de ontbrekende waarden in .env.local in');
  console.log('2. Test de connectie: npm run test-database');
  console.log('3. Start de app: npm run dev');
  console.log('\n📚 Voor meer info: zie FIREBASE_SETUP.md');
}

// Run setup
setupFirebase().catch(console.error);

