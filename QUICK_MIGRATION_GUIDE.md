# Quick Migration Guide - Vercel naar Self-Hosted

## 🎯 Wat Moet Je Doen?

### 1️⃣ Haal Waarden uit Vercel (2 minuten)

**Optie A: Via CLI (Aanbevolen - Automatisch) 🚀**

```bash
cd /home/stephen/projects/aantekeningen-app
./scripts/export-vercel-env.sh
```

Het script doet automatisch:
- ✅ Installeert Vercel CLI (als nodig)
- ✅ Logt in op Vercel
- ✅ Exporteert alle environment variables naar `.env.local`
- ✅ Maakt backup van bestaande `.env.local`

**Zie `EXPORT_VERCEL_ENV.md` voor details.**

---

**Optie B: Handmatig via Dashboard (Als CLI niet werkt)**

**Ga naar:** [Vercel Dashboard](https://vercel.com/dashboard) → Je project → Settings → Environment Variables

**Kopieer ALLE variabelen die je ziet, vooral:**

✅ **Firebase** (10 variabelen):
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` ⚠️ (let op: kopieer exact, inclusief `\n`)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

✅ **Google OAuth** (4 variabelen):
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (deze moet je later aanpassen)
- `GOOGLE_REFRESH_TOKEN`

✅ **NextAuth** (2 variabelen):
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (deze moet je later aanpassen)

✅ **Security** (2 variabelen):
- `ALLOWED_TEACHER_DOMAIN`
- `TEACHER_EMAIL`

✅ **Optioneel:**
- `OPENAI_API_KEY`
- `CACHE_DURATION_HOURS`
- `MINIO_*` variabelen (als gebruikt)

### 2️⃣ Maak .env.local Bestand

```bash
cd /home/stephen/projects/aantekeningen-app
cp env.example .env.local
nano .env.local
```

**Plak alle waarden vanuit Vercel en pas deze 2 URLs aan:**

```env
NEXTAUTH_URL=https://stephensprive.app
GOOGLE_REDIRECT_URI=https://stephensprive.app
```

### 3️⃣ Update Google OAuth (2 minuten)

**Waarom?** Google moet weten dat je nieuwe URL mag gebruiken voor OAuth redirects.

**Stappen:**

1. Ga naar [Google Cloud Console](https://console.cloud.google.com/)
2. Selecteer je project
3. Ga naar: **APIs & Services** → **Credentials**
4. Klik op je **OAuth 2.0 Client ID**
5. Scroll naar **Authorized redirect URIs**
6. Klik **+ ADD URI**
7. Voeg toe: `https://stephensprive.app/api/auth/callback/google`
8. Klik **SAVE**

**Klaar!** 🎉

### 4️⃣ Deploy

```bash
cd /home/stephen/projects/aantekeningen-app
./deploy-docker.sh
```

## ⚠️ Belangrijke Tips

1. **FIREBASE_PRIVATE_KEY**: Kopieer exact zoals het is, inclusief alle `\n` characters
2. **NEXTAUTH_SECRET**: Behoud dezelfde waarde (anders moeten gebruikers opnieuw inloggen)
3. **Google Redirect URI**: Wacht 2-3 minuten na het opslaan voordat je test
4. **MinIO**: Als je MinIO gebruikt, pas `MINIO_ENDPOINT` aan naar `http://localhost:9000` of je publieke URL

## ❓ Problemen?

- **"redirect_uri_mismatch"**: Check of je de redirect URI correct hebt toegevoegd in Google Cloud Console
- **Firebase errors**: Check of `FIREBASE_PRIVATE_KEY` correct is gekopieerd (met `\n`)
- **Container start niet**: Check logs met `docker-compose logs`

## 📚 Meer Details?

Zie `VERCEL_TO_SELF_HOSTED_MIGRATION.md` voor uitgebreide instructies.

