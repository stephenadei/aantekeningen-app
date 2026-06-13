# Ontbrekende Environment Variables

## ✅ Wat We Hebben

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

Deze variabelen staan **niet** in de huidige environment:

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
PLATFORM_API_URL (als datalake via API)
PLATFORM_API_KEY (als datalake via API)
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, DATALAKE_BUCKET (als direct S3)
MINIO_* (optioneel, legacy S3-compat)
CRON_SECRET (als gebruikt)
```

## 🔍 Waarom Ontbreken Ze?

**Mogelijke redenen:**

1. **Firebase variabelen staan niet in .env.local**
   - Ze zijn misschien alleen lokaal geconfigureerd
   - Of ze zijn verwijderd

2. **Ze staan in een andere environment**
   - Preview environment
   - Development environment

3. **Ze zijn nooit toegevoegd**
   - Misschien alleen lokaal gebruikt

## ✅ Oplossing

### Optie 1: Haal Ze Uit Firebase Console

1. Ga naar [Firebase Console](https://console.firebase.google.com)
2. Selecteer je project
3. Ga naar Project Settings → General
4. Scroll naar "Your apps" sectie
5. Kopieer Firebase configuratie naar `.env.local`

### Optie 2: Haal Ze Uit Je Lokale Backup

Als je een oude `.env.local` backup hebt:

```bash
# Check backups
ls -la .env.local.backup.*

# Bekijk een backup
cat .env.local.backup.YYYYMMDD_HHMMSS | grep FIREBASE
```

### Optie 3: Haal Ze Uit Firebase Console

Haal ze uit Firebase Console:

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

## 📝 Volgende Stappen

1. **Check Firebase Console** voor Firebase configuratie
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

