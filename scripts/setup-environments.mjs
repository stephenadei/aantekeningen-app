#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🚀 Setting up environment configuration for Aantekeningen App...\n');

// Check current environment
const isVercel = !!process.env.VERCEL;

console.log(`📍 Current environment: ${isVercel ? 'Vercel Production' : 'Local Development'}`);

// Environment-specific configuration
const configs = {
  local: {
    NEXTAUTH_URL: 'http://localhost:3000',
    DATABASE_URL: 'file:./dev.db',
    GOOGLE_REDIRECT_URI: 'http://localhost:3000/api/auth/callback/google',
    NODE_ENV: 'development',
  },
  vercel: {
    NEXTAUTH_URL: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://your-app.vercel.app',
    DATABASE_URL: 'postgres://username:password@host:port/database', // Will be set by Vercel
    GOOGLE_REDIRECT_URI: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/auth/callback/google` : 'https://your-app.vercel.app/api/auth/callback/google',
    NODE_ENV: 'production',
  }
};

// Create .env.local template
const envLocalTemplate = `# ===========================================
# AANTEKENINGEN APP - LOCAL DEVELOPMENT
# ===========================================
# This file is for local development only
# Production values are set in Vercel Dashboard

# ===========================================
# REQUIRED: Google OAuth Configuration
# ===========================================
# Get these from Google Cloud Console → APIs & Services → Credentials
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# ===========================================
# REQUIRED: NextAuth Configuration
# ===========================================
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-local-development-secret-key-here

# ===========================================
# DATABASE (Local: SQLite)
# ===========================================
DATABASE_URL="file:./dev.db"

# ===========================================
# SECURITY CONFIGURATION
# ===========================================
ALLOWED_TEACHER_DOMAIN=stephensprivelessen.nl
TEACHER_EMAIL=lessons@stephensprivelessen.nl

# ===========================================
# OPTIONAL: Google Drive API
# ===========================================
GOOGLE_REFRESH_TOKEN=your_refresh_token_here

# ===========================================
# OPTIONAL: AI Features
# ===========================================
OPENAI_API_KEY=your_openai_api_key_here

# ===========================================
# OPTIONAL: Cache Configuration
# ===========================================
CACHE_DURATION_HOURS=24

# ===========================================
# OPTIONAL: External Integrations
# ===========================================
NEXT_PUBLIC_AANTEKENINGEN_APP_URL=https://your-main-app.vercel.app
`;

// Create Vercel environment variables template
const vercelTemplate = `# ===========================================
# VERCEL ENVIRONMENT VARIABLES
# ===========================================
# Copy these to Vercel Dashboard → Settings → Environment Variables
# Replace placeholder values with your actual values

# ===========================================
# REQUIRED: Database (PostgreSQL)
# ===========================================
# Get this from Vercel Dashboard → Storage → Create Postgres Database
DATABASE_URL=postgres://username:password@host:port/database

# ===========================================
# REQUIRED: NextAuth Configuration
# ===========================================
NEXTAUTH_SECRET=your-production-secret-key-here
NEXTAUTH_URL=https://your-app.vercel.app

# ===========================================
# REQUIRED: Google OAuth Configuration
# ===========================================
# Same values as local development
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# ===========================================
# SECURITY CONFIGURATION
# ===========================================
ALLOWED_TEACHER_DOMAIN=stephensprivelessen.nl
TEACHER_EMAIL=lessons@stephensprivelessen.nl

# ===========================================
# OPTIONAL: Google Drive API
# ===========================================
GOOGLE_REFRESH_TOKEN=your_refresh_token_here

# ===========================================
# OPTIONAL: AI Features
# ===========================================
OPENAI_API_KEY=your_openai_api_key_here

# ===========================================
# OPTIONAL: Cache Configuration
# ===========================================
CACHE_DURATION_HOURS=24

# ===========================================
# OPTIONAL: External Integrations
# ===========================================
NEXT_PUBLIC_AANTEKENINGEN_APP_URL=https://your-main-app.vercel.app

# ===========================================
# PRODUCTION FLAGS
# ===========================================
NODE_ENV=production
`;

// Google OAuth setup instructions
const oauthInstructions = `
🔧 GOOGLE OAUTH SETUP INSTRUCTIONS:

1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Select your project (or create a new one)
3. Navigate to: APIs & Services → Credentials
4. Click "Create Credentials" → "OAuth 2.0 Client IDs"
5. Application type: "Web application"
6. Name: "Aantekeningen App"

📋 AUTHORIZED REDIRECT URIS:
Add these URIs to your Google OAuth client:

LOCAL DEVELOPMENT:
- http://localhost:3000/api/auth/callback/google
- http://localhost:3001/api/auth/callback/google (backup port)

PRODUCTION (Vercel):
- https://your-app.vercel.app/api/auth/callback/google
- https://your-app-git-main.vercel.app/api/auth/callback/google (preview deployments)

7. Copy the Client ID and Client Secret to your .env.local file
8. Save the configuration

⚠️  IMPORTANT: Make sure to add ALL redirect URIs to avoid OAuth errors!
`;

// Main setup function
async function setupEnvironments() {
  try {
    // Create .env.local if it doesn't exist
    const envLocalPath = path.join(projectRoot, '.env.local');
    if (!fs.existsSync(envLocalPath)) {
      fs.writeFileSync(envLocalPath, envLocalTemplate);
      console.log('✅ Created .env.local template');
    } else {
      console.log('ℹ️  .env.local already exists');
    }

    // Create Vercel environment template
    const vercelEnvPath = path.join(projectRoot, '.env.vercel.template');
    fs.writeFileSync(vercelEnvPath, vercelTemplate);
    console.log('✅ Created .env.vercel.template');

    // Create Google OAuth instructions
    const oauthInstructionsPath = path.join(projectRoot, 'GOOGLE_OAUTH_SETUP.md');
    fs.writeFileSync(oauthInstructionsPath, oauthInstructions);
    console.log('✅ Created GOOGLE_OAUTH_SETUP.md');

    console.log('\n🎉 Environment setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Edit .env.local with your Google OAuth credentials');
    console.log('2. Follow instructions in GOOGLE_OAUTH_SETUP.md');
    console.log('3. For Vercel deployment, copy .env.vercel.template to Vercel Dashboard');
    console.log('\n🔗 Useful links:');
    console.log('- Google Cloud Console: https://console.cloud.google.com/');
    console.log('- Vercel Dashboard: https://vercel.com/dashboard');

  } catch (error) {
    console.error('❌ Error setting up environments:', error.message);
    process.exit(1);
  }
}

// Run setup
setupEnvironments();
