# Deployment Guide - Aantekeningen App

## 🚀 Quick Start

### 1. Development Mode (tijdelijk, stopt bij SSH sluiten)
```bash
cd /home/stephen/projects/aantekeningen-app
npm run dev
```

### 2. Production Mode met Docker (blijft draaien na SSH sluiten)

```bash
cd /home/stephen/projects/aantekeningen-app
chmod +x scripts/docker-start.sh
./scripts/docker-start.sh
```

Dit script:
- Bouwt de Docker image
- Start de container
- Configureert auto-restart
- **Blijft draaien na SSH sluiten**
- **Start automatisch op bij reboot** (via Docker restart policy)

### 3. Development Mode met Docker (hot reload)

```bash
cd /home/stephen/projects/aantekeningen-app
chmod +x scripts/docker-dev.sh
./scripts/docker-dev.sh
```

### 3. Background Sync Starten

```bash
cd /home/stephen/projects/aantekeningen-app
chmod +x scripts/start-background-sync.sh
./scripts/start-background-sync.sh
```

Of via API (met CRON_SECRET):
```bash
curl -X GET "http://localhost:3001/api/cron/sync-cache" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## 📊 Docker Commands

```bash
# Start app (production)
./scripts/docker-start.sh

# Start app (development with hot reload)
./scripts/docker-dev.sh

# Stop app
./scripts/docker-stop.sh

# View logs
./scripts/docker-logs.sh        # Production logs
./scripts/docker-logs.sh dev    # Development logs

# Or use docker compose directly:
docker compose ps               # Check status
docker compose logs -f          # View logs
docker compose restart          # Restart
docker compose down             # Stop
docker compose up -d --build    # Rebuild and start
```

## 🔄 Background Sync

De background sync:
- Haalt alle studenten op van Datalake
- Analyseert alle bestanden met AI
- Slaat metadata op in Firestore cache
- Draait in de achtergrond (blokkeert niet)

**Sync blijft draaien** omdat het deel is van de Next.js app process (PM2).

## ✅ App Functionaliteit

De app is nu volledig functioneel met:

✅ **Student Search**: Direct van Datalake  
✅ **File Listing**: Direct van Datalake (met optionele cache metadata)  
✅ **AI Analyse**: Wordt uitgevoerd tijdens background sync  
✅ **Background Sync**: Haalt studenten van Datalake en analyseert bestanden  

## 🔧 Environment Variables

Zorg dat deze zijn ingesteld in `.env.local`:

```env
# MinIO Datalake
MINIO_ENDPOINT=your-minio-endpoint
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key

# OpenAI (voor AI analyse)
OPENAI_API_KEY=your-openai-key

# Firebase (optioneel, voor metadata cache)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-email
FIREBASE_PRIVATE_KEY=your-key

# Cron Secret (voor background sync)
CRON_SECRET=your-secret
```

## 🐛 Troubleshooting

**App stopt na SSH sluiten:**
- Gebruik Docker: `./scripts/docker-start.sh`
- Docker containers blijven draaien na SSH sluiten

**Background sync werkt niet:**
- Check logs: `pm2 logs aantekeningen-app`
- Check CRON_SECRET in `.env.local`
- Test endpoint: `curl http://localhost:3001/api/cron/sync-cache -H "Authorization: Bearer $CRON_SECRET"`

**Bestanden niet gevonden:**
- Check MinIO credentials
- Test datalake: `curl http://localhost:3001/api/test` (als endpoint bestaat)

