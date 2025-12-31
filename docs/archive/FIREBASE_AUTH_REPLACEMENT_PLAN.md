# Firebase Auth Replacement Plan

## Current State
- Firebase Auth gebruikt voor admin authenticatie
- Google OAuth via Firebase
- Session cookies met Firebase tokens
- 24 API routes gebruiken `verifyFirebaseTokenFromCookie`
- Client-side auth state management

## Replacement: NextAuth.js

### Benefits
- Native Next.js integratie
- Google OAuth support
- Session management
- Geen Firebase dependency
- Simpler codebase

### Implementation Steps

1. **Install NextAuth.js**
   ```bash
   npm install next-auth
   ```

2. **Create NextAuth configuration**
   - `/src/app/api/auth/[...nextauth]/route.ts`
   - Google provider configureren
   - Session strategy: JWT
   - Callbacks voor email domain check

3. **Replace client-side auth**
   - `/src/app/admin/login/page.tsx` - gebruik NextAuth signIn
   - `/src/app/admin/layout.tsx` - gebruik NextAuth session

4. **Replace server-side auth**
   - `/src/lib/firebase-auth.ts` → `/src/lib/auth.ts`
   - `verifyFirebaseTokenFromCookie` → `getServerSession`
   - Update alle 24 API routes

5. **Update auth routes**
   - `/api/auth/google` → verwijder (NextAuth handles this)
   - `/api/auth/logout` → verwijder (NextAuth handles this)
   - `/api/auth/me` → gebruik NextAuth session

6. **Remove Firebase Auth dependencies**
   - Remove `firebase-auth` package
   - Remove `firebase-client.ts`
   - Remove Firebase Auth tests

7. **Update tests**
   - Remove Firebase Auth tests
   - Add NextAuth tests if needed

## Environment Variables Needed

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-secret>
GOOGLE_CLIENT_ID=<from-google-cloud>
GOOGLE_CLIENT_SECRET=<from-google-cloud>
```

## Migration Notes

- Session cookies worden automatisch beheerd door NextAuth
- Email domain check gebeurt in NextAuth callbacks
- Audit logging blijft hetzelfde (via Firestore)



## Current State
- Firebase Auth gebruikt voor admin authenticatie
- Google OAuth via Firebase
- Session cookies met Firebase tokens
- 24 API routes gebruiken `verifyFirebaseTokenFromCookie`
- Client-side auth state management

## Replacement: NextAuth.js

### Benefits
- Native Next.js integratie
- Google OAuth support
- Session management
- Geen Firebase dependency
- Simpler codebase

### Implementation Steps

1. **Install NextAuth.js**
   ```bash
   npm install next-auth
   ```

2. **Create NextAuth configuration**
   - `/src/app/api/auth/[...nextauth]/route.ts`
   - Google provider configureren
   - Session strategy: JWT
   - Callbacks voor email domain check

3. **Replace client-side auth**
   - `/src/app/admin/login/page.tsx` - gebruik NextAuth signIn
   - `/src/app/admin/layout.tsx` - gebruik NextAuth session

4. **Replace server-side auth**
   - `/src/lib/firebase-auth.ts` → `/src/lib/auth.ts`
   - `verifyFirebaseTokenFromCookie` → `getServerSession`
   - Update alle 24 API routes

5. **Update auth routes**
   - `/api/auth/google` → verwijder (NextAuth handles this)
   - `/api/auth/logout` → verwijder (NextAuth handles this)
   - `/api/auth/me` → gebruik NextAuth session

6. **Remove Firebase Auth dependencies**
   - Remove `firebase-auth` package
   - Remove `firebase-client.ts`
   - Remove Firebase Auth tests

7. **Update tests**
   - Remove Firebase Auth tests
   - Add NextAuth tests if needed

## Environment Variables Needed

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-secret>
GOOGLE_CLIENT_ID=<from-google-cloud>
GOOGLE_CLIENT_SECRET=<from-google-cloud>
```

## Migration Notes

- Session cookies worden automatisch beheerd door NextAuth
- Email domain check gebeurt in NextAuth callbacks
- Audit logging blijft hetzelfde (via Firestore)

