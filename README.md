# Aantekeningen App - Stephen's Privelessen

Een zelfstandige Next.js applicatie voor het beheren en bekijken van student aantekeningen via Google Drive.

## Features

- 🔍 **Student Search**: Zoek studenten op naam (case-insensitive)
- 📁 **File Management**: Bekijk en download aantekeningen per student
- 🎨 **Modern UI**: Responsive design met Tailwind CSS
- ⚡ **Caching**: In-memory caching voor betere performance
- 🤖 **AI Analysis**: OpenAI integratie voor document metadata (optioneel)
- 🌐 **Multi-language**: Nederlands/Engels support

## Setup

### 1. Google OAuth2 Setup (Aanbevolen)

**Stap 1: Google Cloud Console**
1. Ga naar [Google Cloud Console](https://console.cloud.google.com/)
2. Maak een nieuw project of selecteer een bestaand project
3. Activeer de Google Drive API:
   - Ga naar "APIs & Services" → "Library"
   - Zoek "Google Drive API" en activeer het
4. Maak OAuth2 credentials:
   - Ga naar "APIs & Services" → "Credentials"
   - Klik "Create Credentials" → "OAuth client ID"
   - Selecteer "Web application"
   - Voeg toe: `http://localhost:3001/api/auth/callback`
   - Download de JSON credentials

**Stap 2: Environment Variables**
Kopieer `.env.example` naar `.env.local`:
```bash
cp .env.example .env.local
```

Vul de OAuth2 credentials in uit het gedownloade JSON bestand:
```bash
GOOGLE_CLIENT_ID=your_client_id_from_json
GOOGLE_CLIENT_SECRET=your_client_secret_from_json
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/callback
```

**Stap 3: OAuth2 Token Setup**
Run de OAuth setup script:
```bash
npm run setup-oauth
```

Dit script zal:
1. Een authorization URL genereren
2. Je vragen om in te loggen en toestemming te geven
3. Een refresh token genereren
4. De benodigde environment variables tonen

**Stap 4: Folder Permissions**
Zorg dat je Google account toegang heeft tot de Notability/Priveles folders.

### 2. Installatie

```bash
npm install
```

### 3. Development

```bash
npm run dev
```

De app is nu beschikbaar op [http://localhost:3001](http://localhost:3001)

### 4. Build voor Productie

```bash
npm run build
npm start
```

## Deployment

### Vercel (Aanbevolen)

1. Push je code naar GitHub
2. Ga naar [Vercel](https://vercel.com)
3. Import je repository
4. Voeg environment variables toe in Vercel dashboard:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REFRESH_TOKEN`
   - `GOOGLE_REDIRECT_URI` (update naar je productie URL)
5. Deploy!

### Andere Platforms

De app kan ook gedeployed worden op:
- Netlify
- Railway
- Heroku
- AWS Amplify

## API Endpoints

- `GET /api/students/search?q={name}` - Zoek studenten
- `GET /api/students/{id}/files` - Lijst bestanden van student
- `GET /api/students/{id}/overview` - Student overzicht
- `GET /api/test` - Test Google Drive connectie

## Project Structuur

```
src/
├── app/
│   ├── api/           # API routes
│   ├── page.tsx       # Hoofdpagina
│   └── layout.tsx     # App layout
├── lib/
│   └── google-drive-simple.ts # Google Drive OAuth service
├── scripts/
│   └── setup-oauth.js # OAuth setup script
└── public/            # Static assets
```

## Troubleshooting

### OAuth2 Errors
- Controleer of de redirect URI correct is ingesteld
- Zorg dat de Google Drive API geactiveerd is
- Controleer of alle environment variables correct zijn

### Google Drive API Errors
- Controleer of je account toegang heeft tot de Notability/Priveles folders
- Zorg dat de OAuth2 consent screen correct is ingesteld
- Controleer of de refresh token nog geldig is

### Build Errors
- Zorg dat alle environment variables correct zijn ingesteld
- Controleer of alle dependencies geïnstalleerd zijn

### Performance Issues
- De app gebruikt in-memory caching voor betere performance
- Voor productie, overweeg Redis voor caching
- AI analyse kan uitgeschakeld worden door geen OpenAI API key in te stellen

## Support

Voor vragen of problemen, neem contact op met Stephen's Privelessen.

## License

Privé - Stephen's Privelessen
