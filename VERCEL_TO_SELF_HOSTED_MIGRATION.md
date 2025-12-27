# Stap-voor-Stap: Vercel → Self-Hosted Migratie

Deze guide helpt je precies welke waarden je uit Vercel moet halen en wat je met Google moet doen.

## 📋 Stap 1: Exporteer Environment Variables van Vercel

### 1.1 Ga naar Vercel Dashboard

1. Open [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecteer je **aantekeningen-app** project
3. Ga naar **Settings** → **Environment Variables**

### 1.2 Kopieer Alle Variabelen

Je moet **alle** environment variables kopiëren. Hier is een checklist:

#### 🔥 Firebase Variabelen (VERPLICHT)
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

#### 🔐 Google OAuth Variabelen (VERPLICHT)
```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
GOOGLE_REFRESH_TOKEN
```

#### 🔑 NextAuth Variabelen (VERPLICHT)
```
NEXTAUTH_SECRET
NEXTAUTH_URL
```

#### 🛡️ Security Variabelen (VERPLICHT)
```
ALLOWED_TEACHER_DOMAIN
TEACHER_EMAIL
```

#### 🤖 AI Variabelen (OPTIONEEL)
```
OPENAI_API_KEY
```

#### ⚙️ Configuratie Variabelen (OPTIONEEL)
```
CACHE_DURATION_HOURS
```

#### 📦 MinIO Variabelen (ALS GEBRUIKT)
```
MINIO_ENDPOINT
MINIO_ACCESS_KEY
MINIO_SECRET_KEY
MINIO_SECURE
```

### 1.3 Export Methode

**Optie A: Handmatig Kopiëren (Aanbevolen)**
1. Klik op elke variabele in Vercel Dashboard
2. Kopieer de **naam** en **waarde**
3. Noteer ze in een tekstbestand of direct in `.env.local`

**Optie B: Vercel CLI (Als Geïnstalleerd)**
```bash
# Installeer Vercel CLI (als nog niet gedaan)
npm i -g vercel

# Login
vercel login

# Link project
cd /home/stephen/projects/aantekeningen-app
vercel link

# Pull environment variables
vercel env pull .env.local
```

### 1.4 Belangrijke Notities

⚠️ **LET OP:**
- `FIREBASE_PRIVATE_KEY` moet **exact** worden gekopieerd, inclusief `\n` characters
- `NEXTAUTH_SECRET` moet worden behouden (anders moeten gebruikers opnieuw inloggen)
- `GOOGLE_REFRESH_TOKEN` is belangrijk - zonder deze werkt Google Drive API niet

## 📝 Stap 2: Maak .env.local Bestand

### 2.1 Kopieer Template

```bash
cd /home/stephen/projects/aantekeningen-app
cp env.example .env.local
```

### 2.2 Vul Waarden In

Open `.env.local` en vul alle waarden in vanuit Vercel:

```bash
nano .env.local
```

### 2.3 Belangrijke Aanpassingen

**Update deze URLs:**
```env
# VAN (Vercel):
NEXTAUTH_URL=https://stephensprive.app  # (of je Vercel URL)
GOOGLE_REDIRECT_URI=https://stephensprive.app  # (of je Vercel URL)

# NAAR (Self-Hosted):
NEXTAUTH_URL=https://stephensprive.app
GOOGLE_REDIRECT_URI=https://stephensprive.app
```

**Als je MinIO gebruikt:**
```env
# Als MinIO lokaal draait:
MINIO_ENDPOINT=http://localhost:9000
MINIO_SECURE=false

# Als MinIO publiek is:
MINIO_ENDPOINT=https://minio.stephensprive.app
MINIO_SECURE=true
```

## 🔧 Stap 3: Google OAuth Redirect URI Bijwerken

### 3.1 Waarom Dit Nodig Is

Google OAuth werkt alleen met **geautoriseerde redirect URIs**. Als je de app verplaatst van Vercel naar self-hosted, moet je de nieuwe URL toevoegen aan Google Cloud Console.

### 3.2 Stap-voor-Stap Instructies

#### 3.2.1 Ga naar Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Selecteer je project (hetzelfde project als waar je OAuth credentials vandaan komen)

#### 3.2.2 Navigeer naar Credentials

1. Klik op **APIs & Services** in het menu
2. Klik op **Credentials** in het submenu
3. Zoek je **OAuth 2.0 Client ID** (meestal genaamd "Web client" of "Aantekeningen App")

#### 3.2.3 Update Authorized Redirect URIs

1. Klik op je OAuth 2.0 Client ID om te bewerken
2. Scroll naar **Authorized redirect URIs**
3. **Voeg toe:**
   ```
   https://stephensprive.app/api/auth/callback/google
   ```
4. **Optioneel - Verwijder oude Vercel URIs:**
   - `https://aantekeningen-app.vercel.app/api/auth/callback/google`
   - `https://aantekeningen-app-*.vercel.app/api/auth/callback/google`
   - (Alleen als je zeker weet dat je Vercel niet meer gebruikt)

5. Klik op **Save**

### 3.3 Verificatie

Na het opslaan zou je binnen een paar minuten de nieuwe redirect URI moeten kunnen gebruiken.

## ✅ Stap 4: Verificatie Checklist

Voordat je deployt, controleer:

- [ ] Alle environment variables gekopieerd van Vercel
- [ ] `.env.local` aangemaakt en ingevuld
- [ ] `NEXTAUTH_URL` aangepast naar `https://stephensprive.app`
- [ ] `GOOGLE_REDIRECT_URI` aangepast naar `https://stephensprive.app`
- [ ] Google OAuth redirect URI toegevoegd in Google Cloud Console
- [ ] `FIREBASE_PRIVATE_KEY` correct gekopieerd (met `\n` characters)
- [ ] MinIO configuratie aangepast (als gebruikt)

## 🚀 Stap 5: Deploy

Nu kun je deployen:

```bash
cd /home/stephen/projects/aantekeningen-app
./deploy-docker.sh
```

## 🧪 Stap 6: Test

### 6.1 Test Health Endpoint

```bash
curl http://localhost:3001/health
```

### 6.2 Test Website

```bash
curl -I https://stephensprive.app
```

### 6.3 Test Google OAuth

1. Open `https://stephensprive.app` in browser
2. Probeer in te loggen met Google
3. Controleer of redirect werkt

## ❌ Troubleshooting

### Probleem: "redirect_uri_mismatch" Error

**Oorzaak:** Google OAuth redirect URI niet toegevoegd of verkeerd gespeld.

**Oplossing:**
1. Check Google Cloud Console → Credentials
2. Verifieer dat `https://stephensprive.app/api/auth/callback/google` exact is toegevoegd
3. Wacht 2-3 minuten na het opslaan
4. Probeer opnieuw

### Probleem: Firebase Errors

**Oorzaak:** `FIREBASE_PRIVATE_KEY` niet correct gekopieerd.

**Oplossing:**
1. Check of de private key `\n` characters bevat
2. In `.env.local` moet het er zo uitzien:
   ```env
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
   ```
3. Kopieer opnieuw vanuit Vercel Dashboard

### Probleem: NextAuth Errors

**Oorzaak:** `NEXTAUTH_URL` niet correct.

**Oplossing:**
1. Check `.env.local`:
   ```env
   NEXTAUTH_URL=https://stephensprive.app
   ```
2. Zorg dat er geen trailing slash is
3. Zorg dat het `https://` gebruikt (niet `http://`)

## 📞 Hulp

Als je problemen hebt:
1. Check container logs: `docker-compose logs -f`
2. Check `.env.local` of alle variabelen correct zijn
3. Verifieer Google OAuth redirect URI in Google Cloud Console
4. Check `MIGRATION_TO_SELF_HOSTED.md` voor meer details

