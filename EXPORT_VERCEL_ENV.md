# Export Vercel Environment Variables via CLI

Deze guide laat zien hoe je environment variables automatisch uit Vercel haalt via de CLI.

## 🚀 Quick Start

```bash
cd /home/stephen/projects/aantekeningen-app
./scripts/export-vercel-env.sh
```

Het script doet automatisch:
- ✅ Installeert Vercel CLI (als nodig)
- ✅ Logt in op Vercel (als nodig)
- ✅ Linkt project (als nodig)
- ✅ Exporteert alle environment variables naar `.env.local`
- ✅ Maakt backup van bestaande `.env.local`

## 📋 Stap-voor-Stap

### Stap 1: Run het Script

```bash
cd /home/stephen/projects/aantekeningen-app
./scripts/export-vercel-env.sh
```

### Stap 2: Volg de Prompts

Het script zal je vragen:
1. **Login op Vercel** (als je nog niet ingelogd bent)
   - Opent browser voor authenticatie
   - Of gebruik email/password

2. **Selecteer je project** (als project niet gelinkt is)
   - Kies je `aantekeningen-app` project
   - Bevestig de settings

### Stap 3: Update URLs

Na het exporteren, **pas deze 2 URLs aan** in `.env.local`:

```bash
nano .env.local
```

Zoek en update:
```env
NEXTAUTH_URL=https://stephensprive.app
GOOGLE_REDIRECT_URI=https://stephensprive.app
```

### Stap 4: Deploy

```bash
./deploy-docker.sh
```

## 🔧 Handmatige Methode (Als Script Niet Werkt)

### Installeer Vercel CLI

```bash
sudo npm install -g vercel
```

### Login

```bash
vercel login
```

### Link Project

```bash
cd /home/stephen/projects/aantekeningen-app
vercel link
```

Selecteer je project wanneer gevraagd.

### Pull Environment Variables

```bash
# Pull voor production environment
vercel env pull .env.local --environment=production --yes
```

## 📝 Wat Wordt Geëxporteerd?

Het script exporteert **alle** environment variables die in Vercel staan voor het `production` environment:

- Firebase configuratie
- Google OAuth credentials
- NextAuth settings
- Security settings
- AI/OpenAI keys
- MinIO configuratie
- En alle andere variabelen

## ⚠️ Belangrijke Notities

### URLs Moeten Worden Aangepast

Na het exporteren moet je deze URLs aanpassen:

```env
# VAN (Vercel):
NEXTAUTH_URL=https://aantekeningen-app.vercel.app
GOOGLE_REDIRECT_URI=https://aantekeningen-app.vercel.app

# NAAR (Self-Hosted):
NEXTAUTH_URL=https://stephensprive.app
GOOGLE_REDIRECT_URI=https://stephensprive.app
```

### Backup

Het script maakt automatisch een backup van je bestaande `.env.local`:
- Format: `.env.local.backup.YYYYMMDD_HHMMSS`
- Je kunt altijd teruggaan naar de backup

### Environment Types

Het script gebruikt `--environment=production`. Als je andere environments hebt:

```bash
# Development
vercel env pull .env.local --environment=development

# Preview
vercel env pull .env.local --environment=preview
```

## 🐛 Troubleshooting

### "Vercel CLI not found"

**Oplossing:**
```bash
sudo npm install -g vercel
```

### "Not logged in"

**Oplossing:**
```bash
vercel login
```

### "Project not linked"

**Oplossing:**
```bash
cd /home/stephen/projects/aantekeningen-app
vercel link
```

### "Permission denied"

**Oplossing:**
```bash
chmod +x scripts/export-vercel-env.sh
```

### "Failed to pull environment variables"

**Mogelijke oorzaken:**
1. Project niet correct gelinkt → Run `vercel link` opnieuw
2. Geen toegang tot project → Check Vercel Dashboard
3. Geen environment variables in Vercel → Check Vercel Dashboard → Settings → Environment Variables

## ✅ Verificatie

Na het exporteren, check of alles correct is:

```bash
# Check of .env.local bestaat
ls -la .env.local

# Check aantal variabelen
grep -v "^#" .env.local | grep "=" | wc -l

# Check belangrijke variabelen
grep -E "FIREBASE_PROJECT_ID|GOOGLE_CLIENT_ID|NEXTAUTH_SECRET" .env.local
```

## 📚 Meer Informatie

- Vercel CLI Docs: https://vercel.com/docs/cli
- Environment Variables: https://vercel.com/docs/concepts/projects/environment-variables

## 🎯 Voordelen van CLI Methode

✅ **Automatisch**: Geen handmatig kopiëren nodig  
✅ **Accuraat**: Geen typfouten  
✅ **Compleet**: Alle variabelen worden geëxporteerd  
✅ **Backup**: Automatische backup van bestaande file  
✅ **Snel**: Eén commando in plaats van handmatig kopiëren

## 🔄 Alternatief: Handmatig Kopiëren

Als de CLI methode niet werkt, zie:
- `VERCEL_TO_SELF_HOSTED_MIGRATION.md` - Voor handmatige methode

