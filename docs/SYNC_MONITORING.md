# Background Sync Monitoring

## Hoe te weten wanneer een sync is gebeurd

Er zijn verschillende manieren om te controleren wanneer een background sync is uitgevoerd:

### 1. 📋 Cron Job Logs (Aanbevolen)

De cron job logt elke run naar een bestand:

```bash
# Bekijk de cron log
tail -f /home/stephen/logs/aantekeningen-sync-cron.log

# Laatste 20 regels
tail -20 /home/stephen/logs/aantekeningen-sync-cron.log

# Zoek naar specifieke datum
grep "2025-12-27" /home/stephen/logs/aantekeningen-sync-cron.log
```

**Voordeel**: Toont exact wanneer de cron job is getriggerd en of deze succesvol was.

### 2. 🐳 Docker Logs

De app logt alle sync activiteit:

```bash
cd /home/stephen/projects/aantekeningen-app

# Recente sync activiteit
docker-compose logs --tail 100 | grep -E "sync|Sync|🔄|✅|📚"

# Laatste sync completion
docker-compose logs | grep "🎉 Full sync completed" | tail -1

# Live monitoring
docker-compose logs -f | grep sync
```

**Voordeel**: Toont gedetailleerde informatie over wat er gebeurt tijdens de sync.

### 3. 📊 Status Check Script

Gebruik het handige status check script:

```bash
/home/stephen/projects/aantekeningen-app/scripts/check-sync-status.sh
```

Dit script toont:
- Cron log status
- Aantal metadata bestanden in datalake
- Recente sync activiteit
- Laatste sync completion
- Volgende geplande run

### 4. 📁 Metadata Bestanden Tellen

Tel het aantal metadata bestanden in de datalake:

```bash
# Totaal aantal metadata bestanden
docker exec minio mc find local/bronze-education/notability/Priveles/ \
  -name "*.metadata.json" 2>/dev/null | wc -l

# Nieuwste metadata bestand
docker exec minio mc find local/bronze-education/notability/Priveles/ \
  -name "*.metadata.json" 2>/dev/null | head -1
```

**Voordeel**: Directe indicatie van hoeveel bestanden zijn gesynced.

### 5. 🔥 Firestore Sync Status (Als Firebase beschikbaar is)

De sync slaat een timestamp op in Firestore:

```bash
# Via de admin API (vereist authenticatie)
curl http://localhost:3001/api/admin/sync \
  -H "Cookie: <your-auth-cookie>"
```

**Voordeel**: Gecentraliseerde status in de database.

## Wanneer draait de sync?

De cron job draait **elke 12 uur**:
- Om **00:00** (middernacht)
- Om **12:00** (middag)

## Handmatig Triggeren

Je kunt de sync ook handmatig triggeren:

```bash
# Via het script
/home/stephen/projects/aantekeningen-app/scripts/start-background-sync.sh

# Of direct via curl
curl -X GET "http://localhost:3001/api/cron/sync-cache" \
  -H "Authorization: Bearer $(cat /home/stephen/projects/aantekeningen-app/.env.local | grep CRON_SECRET | cut -d '=' -f2)"
```

## Monitoring Checklist

Gebruik deze checklist om te verifiëren dat syncs goed draaien:

- [ ] Cron log file bestaat en wordt bijgewerkt
- [ ] Docker logs tonen sync activiteit
- [ ] Aantal metadata bestanden neemt toe
- [ ] Geen errors in logs
- [ ] Sync completion berichten verschijnen

## Troubleshooting

### Sync draait niet
1. Check cron service: `systemctl status cron`
2. Check cron logs: `grep CRON /var/log/syslog`
3. Test script handmatig: `/home/stephen/projects/aantekeningen-app/scripts/start-background-sync.sh`

### Sync faalt
1. Check Docker logs: `docker-compose logs | grep -i error`
2. Check MinIO credentials in `.env.local`
3. Check of MinIO draait: `docker ps | grep minio`

### Geen metadata bestanden
1. Check of sync daadwerkelijk draait
2. Check Docker logs voor errors
3. Verifieer dat PDFs in de datalake staan

