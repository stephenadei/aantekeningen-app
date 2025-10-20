# Aantekeningen App

Een standalone Next.js applicatie voor het beheren van student aantekeningen voor Stephen's Privelessen.

## 🚀 Features

- **Student Zoeken**: Zoek studenten op naam
- **Aantekeningen Bekijken**: Bekijk alle aantekeningen van een student
- **Sharing Functionaliteit**: Genereer shareable links voor individuele studenten
- **Google Drive Integratie**: Directe toegang tot Google Drive bestanden
- **AI Metadata**: Automatische extractie van document metadata
- **Responsive Design**: Werkt op desktop en mobiel

## 🔗 Live Demo

- **Hoofdsite**: [stephensprivelessen.nl/aantekeningen](https://stephensprivelessen.nl/aantekeningen)
- **Directe App**: [aantekeningen-app.vercel.app](https://aantekeningen-app.vercel.app)

## 🛠️ Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth + Google OAuth2
- **Storage**: Google Drive API
- **Caching**: Firestore Cache + React Query
- **AI**: OpenAI API (optioneel)
- **Testing**: Vitest + Playwright + c8
- **Deployment**: Vercel

## 📁 Project Structuur

```
src/
├── app/
│   ├── api/
│   │   ├── students/
│   │   │   ├── [id]/
│   │   │   │   ├── files/route.ts
│   │   │   │   ├── overview/route.ts
│   │   │   │   └── share/route.ts
│   │   │   └── search/route.ts
│   │   └── metadata/
│   │       ├── preload/route.ts
│   │       └── status/route.ts
│   ├── student/[id]/page.tsx
│   └── page.tsx
├── lib/
│   └── google-drive-simple.ts
└── tests/
    ├── unit/           # Unit tests (60%)
    ├── integration/    # Integration tests (30%)
    ├── e2e/           # E2E tests (10%)
    ├── security/      # Security tests
    └── performance/   # Performance tests
```

## 🔧 Setup

1. **Clone de repository**:
   ```bash
   git clone https://github.com/stephenadei/aantekeningen-app.git
   cd aantekeningen-app
   ```

2. **Installeer dependencies**:
   ```bash
   npm install
   ```

3. **Configureer Firebase**:
   
   Volg de [Firebase Setup Guide](FIREBASE_SETUP.md) voor het opzetten van Firebase/Firestore.

4. **Configureer environment variables**:
   
   Maak een `.env.local` bestand met de volgende variabelen:
   ```env
   # Firebase Configuration (Server-side - Application Default Credentials)
   FIREBASE_PROJECT_ID=your-project-id
   
   # Firebase Client Configuration (voor frontend)
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   
   # Google OAuth2 Configuration (verplicht)
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000
   GOOGLE_REFRESH_TOKEN=your_refresh_token
   
   # OpenAI API Key (optioneel, voor AI analyse)
   OPENAI_API_KEY=your_openai_api_key
   
   # Cache duration (optioneel, default: 12 uur)
   CACHE_DURATION_HOURS=12
   ```

5. **Setup Google OAuth2**:
   ```bash
   # Run OAuth2 setup script
   npm run setup-oauth
   ```
   
   Dit script helpt je met het genereren van de refresh token.

6. **Test de database connectie**:
   ```bash
   # Test Firestore connectie
   npm run test-database
   ```

7. **Start development server**:
   ```bash
   npm run dev
   ```

## 🧪 Testing

De app heeft een uitgebreide test suite met unit, integration, E2E, security en performance tests:

### Test Commands
```bash
# Run all tests
npm run test:ci

# Individual test types
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:e2e          # E2E tests
npm run test:security     # Security tests
npm run test:performance  # Performance tests
npm run test:smoke        # Smoke tests

# Development
npm run test:watch        # Watch mode
npm run test:ui           # Interactive UI
npm run test:coverage     # Coverage report
npm run test:summary      # Test summary
```

### E2E Test Setup
Voor E2E tests met Playwright, installeer eerst de browsers:
```bash
npx playwright install
```

### Test Coverage
- **Unit tests**: 80%+ coverage target
- **Integration tests**: 70%+ coverage target
- **Overall**: 75%+ coverage target

### CI/CD
Tests run automatically on every push and pull request via GitHub Actions. See [TESTING.md](TESTING.md) for detailed documentation.

## 🚀 Performance Optimalisatie

De app gebruikt een geavanceerde 3-layer caching strategie voor optimale prestaties:

### Cache Layers
1. **Firestore Cache** - Persistente cache tussen servers (uren/dagen)
2. **React Query** - Client-side cache met automatic refetching (minuten)
3. **Browser Cache** - Local storage en HTTP cache (seconden)

### Performance Targets
- **First Load**: ~200-500ms (Firestore)
- **Cache Hit**: ~50-100ms (Firestore + indexes)
- **Subsequent Loads**: ~10-50ms (browser cache)
- **Google Drive API calls**: Alleen bij sync (6u interval)

### Cache Management
- **Admin Dashboard**: `/admin/cache` voor monitoring
- **Background Sync**: Automatische sync elke 6 uur
- **Manual Sync**: Via admin dashboard of API
- **Migration**: `npm run migrate-cache` voor initial setup

### Student Management
- **Initial Setup**: `npm run init-students` om studenten te migreren van Google Drive naar Firestore
- **Hybrid Search**: Firestore eerst, Google Drive als fallback
- **Auto-migration**: Studenten worden automatisch gemigreerd bij eerste zoekopdracht

## 📚 API Endpoints

### Student Endpoints
- `GET /api/students/search?q={name}` - Zoek studenten op naam
- `GET /api/students/{id}/files` - Haal bestanden van student op
- `GET /api/students/{id}/overview` - Haal overzicht van student op
- `GET /api/students/{id}/share` - Genereer shareable link

### Metadata Endpoints
- `GET /api/metadata/preload` - Preload alle metadata
- `GET /api/metadata/status` - Controleer cache status

## 🔐 Authentication

De app gebruikt Firebase Authentication met Google OAuth2 voor admin toegang en custom PIN verificatie voor studenten. Zorg ervoor dat:

1. Firebase project is geconfigureerd (zie [Firebase Setup Guide](FIREBASE_SETUP.md))
2. Google OAuth2 provider is geactiveerd in Firebase Console
3. Google Drive API is geactiveerd
4. OAuth2 credentials zijn geconfigureerd
5. Refresh token is gegenereerd

## 🚀 Deployment

De app is geconfigureerd voor deployment op Vercel:

1. **Automatische deployment** via GitHub
2. **Environment variables** via Vercel dashboard
3. **Custom domain** mogelijk

## 📱 Sharing Functionaliteit

### Voor Studenten:
1. Zoek je naam in de app
2. Klik op het share icoon (📤)
3. Link wordt gekopieerd naar klembord
4. Deel met ouders/leraren

### Voor Ouders/Leraren:
1. Klik op de gedeelde link
2. Directe toegang tot alle aantekeningen
3. Download/bekijk bestanden individueel

## 🤝 Contributing

1. Fork de repository
2. Maak een feature branch
3. Commit je changes
4. Push naar de branch
5. Open een Pull Request

## 📄 License

Dit project is eigendom van Stephen's Privelessen.

## 📞 Contact

Voor vragen of ondersteuning, neem contact op via [stephensprivelessen.nl](https://stephensprivelessen.nl).# Test deployment

## 🚀 Automatic Deployment
This project is now connected to GitHub for automatic deployments!

## ✅ Git Integration Complete
Automatic deployments are now fully configured!
