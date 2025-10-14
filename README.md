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
- **Authentication**: Google OAuth2
- **Storage**: Google Drive API
- **AI**: OpenAI API (optioneel)
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
└── lib/
    └── google-drive-simple.ts
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

3. **Configureer environment variables**:
   
   Maak een `.env.local` bestand met de volgende variabelen:
   ```env
   # Google OAuth2 Configuration (verplicht)
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:8080
   GOOGLE_REFRESH_TOKEN=your_refresh_token
   
   # OpenAI API Key (optioneel, voor AI analyse)
   OPENAI_API_KEY=your_openai_api_key
   
   # Cache duration (optioneel, default: 12 uur)
   CACHE_DURATION_HOURS=12
   ```

4. **Setup Google OAuth2**:
   ```bash
   # Run OAuth2 setup script
   npm run setup-oauth
   ```
   
   Dit script helpt je met het genereren van de refresh token.

5. **Start development server**:
   ```bash
   npm run dev
   ```

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

De app gebruikt Google OAuth2 voor toegang tot Google Drive. Zorg ervoor dat:

1. Google Drive API is geactiveerd
2. OAuth2 credentials zijn geconfigureerd
3. Refresh token is gegenereerd

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
