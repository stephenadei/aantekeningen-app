#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Load .env.local first, then .env
dotenv.config({ path: path.resolve(projectRoot, '.env.local') });
dotenv.config({ path: path.resolve(projectRoot, '.env') });

import { config, validateConfig } from '../src/lib/config.ts';

console.log('🔍 Checking Aantekeningen App Configuration...\n');

// Display current configuration
console.log('📊 Current Configuration:');
console.log('========================');
console.log(`Environment: ${config.debug.environment}`);
console.log(`Platform: ${config.debug.isVercel ? 'Vercel' : 'Local'}`);
console.log(`Base URL: ${config.debug.baseUrl}`);
console.log(`Database: ${config.debug.databaseType}`);
console.log(`OAuth Redirect: ${config.debug.oauthRedirectUri}`);

console.log('\n🔧 OAuth Configuration:');
console.log('======================');
console.log(`Google Client ID: ${config.oauth.google.clientId ? '✅ Set' : '❌ Missing'}`);
console.log(`Google Client Secret: ${config.oauth.google.clientSecret ? '✅ Set' : '❌ Missing'}`);
console.log(`Redirect URI: ${config.oauth.google.redirectUri}`);

console.log('\n🔒 Security Configuration:');
console.log('==========================');
console.log(`Allowed Domain: ${config.security.allowedTeacherDomain}`);
console.log(`Teacher Email: ${config.security.teacherEmail}`);

console.log('\n⚡ Features:');
console.log('============');
console.log(`OpenAI API: ${config.features.openai.enabled ? '✅ Enabled' : '❌ Disabled'}`);
console.log(`Cache Duration: ${config.features.cache.durationHours} hours`);

// Validate configuration
console.log('\n✅ Configuration Validation:');
console.log('============================');
const isValid = validateConfig();

if (isValid) {
  console.log('\n🎉 Configuration is valid! Your app should work correctly.');
  
  if (!config.debug.isVercel) {
    console.log('\n💡 Local Development Tips:');
    console.log('- Make sure your Google OAuth redirect URI includes:');
    console.log(`  ${config.debug.oauthRedirectUri}`);
    console.log('- If you get OAuth errors, check your Google Cloud Console settings');
    console.log('- Run `npm run dev` to start the development server');
  } else {
    console.log('\n🚀 Production Deployment Tips:');
    console.log('- Make sure all environment variables are set in Vercel Dashboard');
    console.log('- Verify your Google OAuth redirect URI includes your Vercel domain');
    console.log('- Check that your database is properly configured');
  }
} else {
  console.log('\n❌ Configuration has errors. Please fix them before running the app.');
  process.exit(1);
}
