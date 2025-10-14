# Vercel Deployment Setup Guide

## Prerequisites

1. **Vercel Account**: Make sure you have a Vercel account and your project is connected
2. **Domain**: Ensure `stephensprive.app` is configured in Vercel
3. **Google OAuth**: Your existing Google OAuth credentials should work

## Step 1: Create Vercel Postgres Database

1. Go to your Vercel project dashboard
2. Navigate to **Storage** tab
3. Click **Create Database** → **Postgres**
4. Choose a name (e.g., `aantekeningen-db`)
5. Select a region close to your users
6. Click **Create**
7. Copy the **Connection String** (you'll need this for `DATABASE_URL`)

## Step 2: Configure Environment Variables

Go to **Settings** → **Environment Variables** and add:

### Required Variables

```env
# Database
DATABASE_URL=postgres://username:password@host:port/database

# NextAuth
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://stephensprive.app

# Security
ALLOWED_TEACHER_DOMAIN=stephensprivelessen.nl
TEACHER_EMAIL=lessons@stephensprivelessen.nl
```

### Existing Variables (Keep Current Values)

```env
GOOGLE_CLIENT_ID=your_existing_google_client_id
GOOGLE_CLIENT_SECRET=your_existing_google_client_secret
GOOGLE_REDIRECT_URI=your_existing_redirect_uri
GOOGLE_REFRESH_TOKEN=your_existing_refresh_token
OPENAI_API_KEY=your_existing_openai_key
CACHE_DURATION_HOURS=12
```

## Step 3: Generate NEXTAUTH_SECRET

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Copy the output and use it as your `NEXTAUTH_SECRET`.

## Step 4: Deploy and Run Migrations

1. **Deploy the `dev/v1-migration` branch** to test:
   - Go to **Deployments**
   - Click **Create Deployment**
   - Select `dev/v1-migration` branch
   - Deploy

2. **Run database migrations**:
   ```bash
   # Connect to your Vercel project
   vercel link
   
   # Run migrations
   npx prisma migrate deploy
   npx prisma generate
   ```

   Or use Vercel's built-in terminal:
   - Go to **Functions** tab
   - Click **Terminal**
   - Run the migration commands

## Step 5: Test the Deployment

### Test Admin Portal
1. Visit `https://your-preview-url.vercel.app/admin`
2. Try logging in with your Google Workspace account
3. Verify you can access the dashboard

### Test Student Portal
1. Visit `https://your-preview-url.vercel.app/leerling`
2. Test the login form (you'll need to create a student first via admin)

### Test Public Portal
1. Visit `https://your-preview-url.vercel.app/`
2. Verify existing functionality still works

## Step 6: Production Deployment

Once testing is complete:

1. **Merge to main**:
   ```bash
   git checkout main
   git merge dev/v1-migration
   git push origin main
   ```

2. **Update production environment variables**:
   - Set `NEXTAUTH_URL=https://stephensprive.app`
   - Ensure all variables are set for production environment

3. **Run final migrations**:
   ```bash
   npx prisma migrate deploy
   ```

## Step 7: Domain Configuration

1. **Update Google OAuth settings**:
   - Add `https://stephensprive.app/api/auth/callback/google` to authorized redirect URIs
   - Add `https://stephensprive.app` to authorized JavaScript origins

2. **Verify domain settings** in Vercel:
   - Ensure `stephensprive.app` is properly configured
   - Check SSL certificate is active

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Verify `DATABASE_URL` is correct
   - Check if database is active in Vercel dashboard

2. **Authentication Issues**:
   - Verify `NEXTAUTH_SECRET` is set
   - Check `NEXTAUTH_URL` matches your domain
   - Ensure Google OAuth redirect URIs are updated

3. **Build Errors**:
   - Check all environment variables are set
   - Verify Prisma schema is valid
   - Check for TypeScript errors

### Useful Commands

```bash
# Check environment variables
vercel env ls

# View deployment logs
vercel logs

# Connect to database
vercel db connect

# Run Prisma Studio (for debugging)
npx prisma studio
```

## Security Checklist

- [ ] `NEXTAUTH_SECRET` is a secure random string
- [ ] `DATABASE_URL` is properly configured
- [ ] Google OAuth redirect URIs are updated
- [ ] Domain restrictions are working (`@stephensprivelessen.nl`)
- [ ] Security headers are active (check in browser dev tools)
- [ ] HTTPS is enforced (`.app` domains require this)

## Monitoring

After deployment, monitor:

1. **Vercel Analytics**: Check for errors and performance
2. **Database**: Monitor connection usage and query performance
3. **Authentication**: Check audit logs for any issues
4. **Security**: Monitor failed login attempts

## Rollback Plan

If issues occur:

1. **Quick rollback**: Revert to previous deployment in Vercel dashboard
2. **Database rollback**: Use Prisma migrations to rollback schema changes
3. **Environment rollback**: Revert environment variables to previous values

## Support

For issues:
1. Check Vercel deployment logs
2. Review Prisma migration status
3. Verify all environment variables are set correctly
4. Test locally with the same environment variables
