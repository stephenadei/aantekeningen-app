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

## 4. Service Account Setup

**Verplicht**: De app vereist expliciete service account credentials voor betrouwbare authenticatie.

### Stap 1: Service Account Key Genereren
1. Ga naar Firebase Console → Project Settings → Service accounts tab
2. Klik "Generate new private key"
3. Download de JSON file (bewaar deze veilig!)

### Stap 2: Environment Variables Toevoegen
Voeg deze variabelen toe aan je `.env.local`:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Stap 3: Extract Values from JSON
Van de gedownloade JSON file:
- `project_id` → `FIREBASE_PROJECT_ID`
- `client_email` → `FIREBASE_CLIENT_EMAIL`  
- `private_key` → `FIREBASE_PRIVATE_KEY` (houd de quotes en \n characters)

## 5. Environment Variables

Kopieer `.env.local.template` naar `.env.local` en vul alle waarden in:

```bash
cp .env.local.template .env.local
```

Zie [AUTHENTICATION.md](AUTHENTICATION.md) voor gedetailleerde instructies over alle credentials.

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
