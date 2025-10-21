import { google } from 'googleapis';
import readline from 'readline';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function refreshOAuthToken() {
  console.log('🔐 Google OAuth2 Token Refresh voor Aantekeningen App\n');
  
  // Check if we have the required environment variables
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('❌ Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.local');
    console.log('Please make sure these are set in your .env.local file');
    return;
  }
  
  console.log('📋 Current configuration:');
  console.log(`   Client ID: ${process.env.GOOGLE_CLIENT_ID}`);
  console.log(`   Client Secret: ${process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET'}`);
  console.log(`   Redirect URI: ${process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000'}`);
  console.log(`   Current Refresh Token: ${process.env.GOOGLE_REFRESH_TOKEN ? 'SET' : 'NOT SET'}\n`);
  
  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000'
  );

  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.readonly'],
    prompt: 'consent' // Force consent screen to get refresh token
  });

  console.log('📋 Stappen om een nieuwe refresh token te krijgen:');
  console.log('1. Ga naar de volgende URL in je browser:');
  console.log(`   ${authUrl}\n`);
  
  console.log('2. Log in met je Google account');
  console.log('3. Geef toestemming voor Drive toegang');
  console.log('4. Je wordt doorgestuurd naar een pagina met een authorization code');
  console.log('5. Kopieer de authorization code en plak deze hieronder\n');

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve, reject) => {
    rl.question('📝 Plak hier de authorization code: ', async (code) => {
      try {
        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        console.log('\n✅ Nieuwe OAuth2 tokens verkregen!');
        console.log('\n📋 Voeg deze waarden toe aan je .env.local:');
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
        
        if (tokens.access_token) {
          console.log(`GOOGLE_ACCESS_TOKEN=${tokens.access_token}`);
        }

        console.log('\n🎉 Token refresh voltooid! Je kunt nu de app gebruiken.');
        
        // Test the new token
        console.log('\n🧪 Testing nieuwe token...');
        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        
        try {
          const response = await drive.files.list({
            q: "name='Notability' and mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields: 'files(id, name)',
            pageSize: 1,
          });
          
          console.log('✅ Nieuwe token werkt! Drive API toegang succesvol.');
          console.log(`   Gevonden folders: ${response.data.files?.length || 0}`);
        } catch (testError) {
          console.log('❌ Nieuwe token test gefaald:', testError.message);
        }
        
        rl.close();
        resolve(tokens);
      } catch (error) {
        console.error('❌ Fout bij OAuth2 token refresh:', error.message);
        rl.close();
        reject(error);
      }
    });
  });
}

// Run the function
refreshOAuthToken().catch(console.error);

