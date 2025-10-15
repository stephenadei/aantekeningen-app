
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
