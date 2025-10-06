const { google } = require('googleapis');
const readline = require('readline');

// OAuth2 setup script
async function setupOAuth() {
  console.log('🔐 Google OAuth2 Setup voor Aantekeningen App\n');
  
  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080'
  );

  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.readonly'],
    prompt: 'consent' // Force consent screen to get refresh token
  });

  console.log('📋 Stappen:');
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

        console.log('\n✅ OAuth2 setup succesvol!');
        console.log('\n📋 Voeg deze waarden toe aan je .env.local:');
        console.log(`GOOGLE_CLIENT_ID=${process.env.GOOGLE_CLIENT_ID}`);
        console.log(`GOOGLE_CLIENT_SECRET=${process.env.GOOGLE_CLIENT_SECRET}`);
        console.log(`GOOGLE_REDIRECT_URI=http://localhost:8080`);
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
        
        if (tokens.access_token) {
          console.log(`GOOGLE_ACCESS_TOKEN=${tokens.access_token}`);
        }

        console.log('\n🎉 Setup voltooid! Je kunt nu de app gebruiken.');
        
        rl.close();
        resolve(tokens);
      } catch (error) {
        console.error('❌ Fout bij OAuth2 setup:', error.message);
        rl.close();
        reject(error);
      }
    });
  });
}

// Run setup if called directly
if (require.main === module) {
  setupOAuth().catch(console.error);
}

module.exports = { setupOAuth };
