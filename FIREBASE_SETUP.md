# Firebase Setup Guide

Deze guide helpt je met het opzetten van Firebase/Firestore voor de Aantekeningen App.

## 1. Firebase Project Aanmaken

1. Ga naar [Firebase Console](https://console.firebase.google.com/)
2. Klik op "Add project"
3. Geef je project een naam (bijv. "aantekeningen-app")
4. Schakel Google Analytics in (optioneel)
5. Klik "Create project"

## 2. Firestore Database Setup

1. In je Firebase project, ga naar "Firestore Database"
2. Klik "Create database"
3. Kies "Start in production mode" (security rules worden later geconfigureerd)
4. Selecteer een locatie (bijv. "europe-west1" voor Nederland)
5. Klik "Done"

## 3. Firebase Authentication Setup

1. Ga naar "Authentication" in je Firebase project
2. Klik "Get started"
3. Ga naar "Sign-in method" tab
4. Schakel "Google" provider in
5. Voeg je project support email toe
6. Sla de Web SDK configuration op (je hebt dit later nodig)

## 4. Service Account Setup (Zonder Keys)

**Probleem**: Je organisatie blokkeert service account key creation voor security.

**Oplossing**: Gebruik Application Default Credentials (veiliger en eenvoudiger):

### Voor Local Development:
1. Installeer Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Selecteer je project: `firebase use your-project-id`
4. Firebase CLI zorgt automatisch voor credentials

### Voor Vercel Deployment:
1. Ga naar Vercel Dashboard → Project Settings → Environment Variables
2. Voeg alleen toe: `FIREBASE_PROJECT_ID=your-project-id`
3. Vercel gebruikt automatisch Application Default Credentials

**Geen service account keys nodig!** 🎉

## 5. Environment Variables

Voeg de volgende variabelen toe aan je `.env.local` (veel eenvoudiger!):

```env
# Firebase Configuration (Server-side - Application Default Credentials)
FIREBASE_PROJECT_ID=your-project-id

# Firebase Client Configuration (voor frontend)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id

# Bestaande Google Drive configuratie (blijft hetzelfde)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000
GOOGLE_REFRESH_TOKEN=your_refresh_token

# Bestaande configuratie (blijft hetzelfde)
NEXTAUTH_SECRET=your_nextauth_secret
OPENAI_API_KEY=your_openai_api_key
```

## 6. Firestore Security Rules

De security rules zijn al geconfigureerd in `firestore.rules`. Upload deze naar Firebase:

```bash
# Installeer Firebase CLI als je dat nog niet hebt
npm install -g firebase-tools

# Login bij Firebase
firebase login

# Initialiseer Firebase in je project
firebase init firestore

# Deploy de security rules
firebase deploy --only firestore:rules
```

## 7. Data Migratie

Voer de migratie uit van SQLite naar Firestore:

```bash
# Zorg dat je environment variables zijn ingesteld
node scripts/migrate-sqlite-to-firestore.mjs
```

## 8. Test de Setup

Test of alles werkt:

```bash
# Test de database connectie
node scripts/test-database.mjs

# Start de development server
npm run dev
```

## 9. Vercel Deployment

Voor Vercel deployment, voeg de environment variables toe in je Vercel dashboard:

1. Ga naar je project in Vercel
2. Ga naar "Settings" > "Environment Variables"
3. Voeg alle Firebase environment variables toe
4. Deploy je project

## 10. Firebase Console Monitoring

Na deployment kun je monitoren in Firebase Console:

- **Firestore**: Bekijk je data en query performance
- **Authentication**: Bekijk gebruikers en login activiteit
- **Usage**: Monitor kosten en usage limits

## Troubleshooting

### Veelvoorkomende Problemen

1. **"Firebase project not found"**
   - Controleer of `FIREBASE_PROJECT_ID` correct is
   - Zorg dat je project bestaat in Firebase Console

2. **"Permission denied"**
   - Zorg dat Firestore is geactiveerd
   - Controleer of je bent ingelogd met Firebase CLI (`firebase login`)

3. **"Service account key creation disabled"**
   - ✅ **Oplossing**: Gebruik Application Default Credentials (zoals hierboven beschreven)
   - Geen service account keys nodig!

4. **Authentication errors**
   - Controleer of Google provider is geactiveerd
   - Zorg dat authorized domains zijn toegevoegd

### Support

Voor vragen of problemen:
- Check de [Firebase Documentation](https://firebase.google.com/docs)
- Bekijk de console logs voor specifieke error messages
- Controleer de Firebase Console voor project status

## Kosten Overzicht

Firebase/Firestore pricing (per maand):
- **Firestore**: $0.18 per 100K reads, $0.18 per 100K writes
- **Authentication**: Gratis voor de eerste 10K MAU
- **Hosting**: Gratis voor de eerste 10GB

Voor een kleine app zoals deze zijn de kosten meestal < $5/maand.
