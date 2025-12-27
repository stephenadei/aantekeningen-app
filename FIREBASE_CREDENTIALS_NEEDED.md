# Firebase Service Account Credentials Nodig

## ✅ Wat We Hebben

De volgende Firebase variabelen zijn gevonden en toegevoegd aan `.env.local`:

- ✅ `FIREBASE_PROJECT_ID=stephen-s-aantekeningen`
- ✅ `NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyArr2tiLVt72688gGvs3DDclxHeABUVRxI`
- ✅ `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=stephen-s-aantekeningen.firebaseapp.com`
- ✅ `NEXT_PUBLIC_FIREBASE_PROJECT_ID=stephen-s-aantekeningen`
- ✅ `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=stephen-s-aantekeningen.firebasestorage.app`
- ✅ `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=368332757985`
- ✅ `NEXT_PUBLIC_FIREBASE_APP_ID=1:368332757985:web:b9c38cc8abbf2ff93350a0`
- ✅ `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-HZT3CRYLQJ`

## ❌ Wat Nog Ontbreekt

Deze 2 variabelen zijn **niet** in de code gevonden en moeten uit Firebase Console gehaald worden:

### 1. FIREBASE_CLIENT_EMAIL
### 2. FIREBASE_PRIVATE_KEY

## 🔧 Hoe Te Krijgen

### Stap 1: Ga naar Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Selecteer project: **stephen-s-aantekeningen**

### Stap 2: Genereer Service Account Key

1. Klik op **⚙️ Project Settings** (gear icon rechtsboven)
2. Ga naar tab **Service accounts**
3. Klik op **Generate new private key**
4. Bevestig met **Generate key**
5. Een JSON bestand wordt gedownload

### Stap 3: Extract Waarden uit JSON

Open het gedownloade JSON bestand. Het ziet er zo uit:

```json
{
  "type": "service_account",
  "project_id": "stephen-s-aantekeningen",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@stephen-s-aantekeningen.iam.gserviceaccount.com",
  ...
}
```

### Stap 4: Voeg Toe aan .env.local

Voeg deze regels toe aan `.env.local`:

```env
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@stephen-s-aantekeningen.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**⚠️ BELANGRIJK:**
- `FIREBASE_PRIVATE_KEY` moet tussen **dubbele quotes** staan
- De `\n` characters moeten **exact** blijven (niet vervangen door echte newlines)
- Kopieer de hele private key inclusief `-----BEGIN PRIVATE KEY-----` en `-----END PRIVATE KEY-----`

### Stap 5: Verifieer

```bash
cd /home/stephen/projects/aantekeningen-app
grep -E "^FIREBASE" .env.local
```

Je zou nu moeten zien:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- Alle `NEXT_PUBLIC_FIREBASE_*` variabelen

## ✅ Na Toevoegen

Na het toevoegen van de service account credentials:

1. **Update URLs** (als nog niet gedaan):
   ```env
   NEXTAUTH_URL=https://stephensprive.app
   GOOGLE_REDIRECT_URI=https://stephensprive.app
   ```

2. **Test deployment:**
   ```bash
   ./deploy-docker.sh
   ```

## 🔍 Alternatief: Check Oude Backups

Als je een oude backup hebt met deze waarden:

```bash
# Check alle backups
ls -la .env.local.backup.*

# Bekijk een backup
cat .env.local.backup.YYYYMMDD_HHMMSS | grep FIREBASE_CLIENT_EMAIL
cat .env.local.backup.YYYYMMDD_HHMMSS | grep FIREBASE_PRIVATE_KEY
```

## 📝 Samenvatting

**Gevonden in code:**
- ✅ Alle `NEXT_PUBLIC_FIREBASE_*` variabelen
- ✅ `FIREBASE_PROJECT_ID`

**Moet uit Firebase Console:**
- ❌ `FIREBASE_CLIENT_EMAIL`
- ❌ `FIREBASE_PRIVATE_KEY`

**Al geëxporteerd uit Vercel:**
- ✅ Google OAuth credentials
- ✅ NextAuth settings
- ✅ Security settings
- ✅ OpenAI key

