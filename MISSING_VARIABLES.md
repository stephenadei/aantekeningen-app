# Ontbrekende Environment Variables

## ✅ Wat We Hebben (uit Vercel)

De volgende variabelen zijn succesvol geëxporteerd:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `ALLOWED_TEACHER_DOMAIN`
- `TEACHER_EMAIL`
- `OPENAI_API_KEY`
- `CACHE_DURATION_HOURS`
- `DATABASE_URL`

## ❌ Wat Ontbreekt

Deze variabelen staan **niet** in Vercel (of in een andere environment):

### Firebase Variabelen (10 stuks)
```
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
```

### Andere
```
GOOGLE_REDIRECT_URI
MINIO_ENDPOINT (als gebruikt)
MINIO_ACCESS_KEY (als gebruikt)
MINIO_SECRET_KEY (als gebruikt)
MINIO_SECURE (als gebruikt)
CRON_SECRET (als gebruikt)
```

## 🔍 Waarom Ontbreken Ze?

**Mogelijke redenen:**

1. **Firebase variabelen staan niet in Vercel**
   - Ze zijn misschien alleen lokaal geconfigureerd
   - Of ze zijn verwijderd uit Vercel

2. **Ze staan in een andere environment**
   - Preview environment
   - Development environment (al gecheckt - niet gevonden)

3. **Ze zijn nooit toegevoegd aan Vercel**
   - Misschien alleen lokaal gebruikt

## ✅ Oplossing

### Optie 1: Haal Ze Uit Vercel Dashboard (Handmatig)

1. Ga naar [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecteer je project → **Settings** → **Environment Variables**
3. Check alle environments (Production, Preview, Development)
4. Zoek naar Firebase variabelen
5. Kopieer ze handmatig naar `.env.local`

### Optie 2: Haal Ze Uit Je Lokale Backup

Als je een oude `.env.local` backup hebt:

```bash
# Check backups
ls -la .env.local.backup.*

# Bekijk een backup
cat .env.local.backup.YYYYMMDD_HHMMSS | grep FIREBASE
```

### Optie 3: Haal Ze Uit Firebase Console

Als ze niet in Vercel staan, haal ze uit Firebase Console:

1. Ga naar [Firebase Console](https://console.firebase.google.com/)
2. Selecteer je project
3. **Project Settings** (gear icon) → **Service accounts**
4. Klik **Generate new private key** (of gebruik bestaande)
5. Extract waarden uit JSON:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

6. **General** tab → **Your apps** → Web app config:
   - Kopieer alle `NEXT_PUBLIC_FIREBASE_*` waarden

### Optie 4: Check Vercel Dashboard voor Alle Environments

```bash
# Check preview environment
vercel env pull .env.local --environment=preview --yes

# Check alle environments
vercel env ls
```

## 📝 Volgende Stappen

1. **Check Vercel Dashboard** voor Firebase variabelen
2. **Voeg ontbrekende variabelen toe** aan `.env.local`
3. **Update URLs:**
   ```env
   NEXTAUTH_URL=https://stephensprive.app
   GOOGLE_REDIRECT_URI=https://stephensprive.app
   ```
4. **Test deployment**

## 🔍 Verificatie

Na het toevoegen, check of alles er is:

```bash
# Check Firebase variabelen
grep -E "^FIREBASE" .env.local

# Check alle belangrijke variabelen
grep -E "^(FIREBASE|GOOGLE|NEXTAUTH|MINIO)" .env.local | cut -d'=' -f1
```

