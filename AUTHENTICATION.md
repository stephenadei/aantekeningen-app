# Authentication Guide

This document explains all authentication mechanisms used in the Aantekeningen App and how to troubleshoot common issues.

## Overview

The app uses two different authentication systems:

1. **Firebase/Firestore**: Uses service account credentials for server-side database access
2. **Google Drive API**: Uses OAuth2 refresh tokens for accessing Google Drive files

## Firebase Authentication

### Required Environment Variables

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Getting Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings (gear icon) → Service accounts tab
4. Click "Generate new private key"
5. Download the JSON file
6. Extract the values:
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the quotes and \n characters)

### Troubleshooting Firebase Issues

**Error: "Could not load the default credentials"**
- Solution: Add `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` to your `.env.local`

**Error: "invalid_grant" or "invalid_rapt"**
- This usually means the service account key is invalid or expired
- Solution: Generate a new service account key from Firebase Console

**Error: "Project not found"**
- Check that `FIREBASE_PROJECT_ID` matches your Firebase project ID exactly

## Google Drive API Authentication

### Required Environment Variables

```env
GOOGLE_CLIENT_ID=your-oauth-client-id
GOOGLE_CLIENT_SECRET=your-oauth-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000
GOOGLE_REFRESH_TOKEN=your-refresh-token
```

### Getting OAuth2 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to APIs & Services → Credentials
4. Create OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URIs:
   - `http://localhost:3000` (development)
   - `https://your-domain.com` (production)

### Getting a Refresh Token

Use the provided script:

```bash
node scripts/refresh-oauth-token.mjs
```

Follow the instructions to:
1. Visit the generated URL
2. Log in with your Google account
3. Grant Drive access permissions
4. Copy the authorization code
5. Paste it in the terminal

### Troubleshooting Google Drive Issues

**Error: "invalid_grant" or "invalid_rapt"**
- Your refresh token has expired
- Solution: Run `node scripts/refresh-oauth-token.mjs` to get a new token

**Error: "access_denied"**
- The OAuth consent screen needs approval
- Solution: Add your email to test users in Google Cloud Console

**Error: "redirect_uri_mismatch"**
- The redirect URI in your request doesn't match the one in Google Cloud Console
- Solution: Update the redirect URI in Google Cloud Console

## Testing Your Setup

### Check All Credentials

```bash
node scripts/check-credentials.mjs
```

This script will:
- Verify all required environment variables are set
- Test Firebase service account connection
- Test Google OAuth2 token validity
- Show a status report

### Validate Student ID

```bash
node scripts/validate-student-id.mjs <student-id>
```

This script will:
- Check if the ID is a valid Firestore student ID
- Check if the ID is a valid Drive folder ID
- Show what type it is and associated data

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `invalid_rapt` | Expired refresh token | Run `refresh-oauth-token.mjs` |
| `Could not load default credentials` | Missing Firebase credentials | Add service account credentials |
| `Student not found` | ID doesn't exist in Firestore | Check if it's a Drive folder ID instead |
| `Drive folder not found` | Invalid Drive folder ID | Verify the folder exists in Google Drive |

## Security Best Practices

1. **Never commit credentials to git**
   - Use `.env.local` for local development
   - Use environment variables in production (Vercel)

2. **Rotate credentials regularly**
   - Refresh tokens: Every 6 months
   - Service account keys: Every year

3. **Use least privilege**
   - Service account: Only Firestore access
   - OAuth2: Only Drive readonly access

4. **Monitor usage**
   - Check Google Cloud Console for unusual activity
   - Monitor Firebase usage in the console

## Getting Help

If you encounter issues not covered here:

1. Check the logs in your terminal for detailed error messages
2. Run `node scripts/check-credentials.mjs` to verify your setup
3. Check the [Firebase documentation](https://firebase.google.com/docs/admin/setup)
4. Check the [Google Drive API documentation](https://developers.google.com/drive/api/guides/about-sdk)
