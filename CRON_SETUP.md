# Cron Job Setup voor Background Sync

## Overzicht

De background sync wordt automatisch getriggerd via een cron job die elke 12 uur draait.

## Configuratie

### Cron Job
- **Frequentie**: Elke 12 uur (om 00:00 en 12:00)
- **Script**: `/home/stephen/projects/aantekeningen-app/scripts/start-background-sync.sh`
- **Logs**: `/home/stephen/logs/aantekeningen-sync-cron.log`

### Environment Variables

De cron job gebruikt de volgende environment variables uit `.env.local`:
- `CRON_SECRET`: Secret token voor authenticatie met de API endpoint

### Cron Job Entry

```bash
0 */12 * * * /home/stephen/projects/aantekeningen-app/scripts/start-background-sync.sh >> /home/stephen/logs/aantekeningen-sync-cron.log 2>&1
```

## Handmatig Triggeren

Je kunt de sync ook handmatig triggeren:

```bash
# Via het script
/home/stephen/projects/aantekeningen-app/scripts/start-background-sync.sh

# Of direct via curl
curl -X GET "http://localhost:3001/api/cron/sync-cache" \
  -H "Authorization: Bearer $(cat /home/stephen/projects/aantekeningen-app/.env.local | grep CRON_SECRET | cut -d '=' -f2)"
```

## Logs Bekijken

```bash
# Laatste 50 regels van de cron log
tail -50 /home/stephen/logs/aantekeningen-sync-cron.log

# Live monitoring
tail -f /home/stephen/logs/aantekeningen-sync-cron.log

# Docker logs voor meer details
cd /home/stephen/projects/aantekeningen-app
docker-compose logs -f | grep -E "sync|Sync|metadata"
```

## Cron Job Beheren

```bash
# Bekijk alle cron jobs
crontab -l

# Bewerk cron jobs
crontab -e

# Verwijder de sync cron job (als nodig)
crontab -l | grep -v "aantekeningen-sync-cron" | crontab -
```

## Troubleshooting

### Cron job draait niet
1. Check of cron service draait: `systemctl status cron` (of `crond` op sommige systemen)
2. Check cron logs: `grep CRON /var/log/syslog` (of `/var/log/cron`)
3. Test het script handmatig: `/home/stephen/projects/aantekeningen-app/scripts/start-background-sync.sh`

### Authenticatie faalt
1. Check of `CRON_SECRET` in `.env.local` staat
2. Check of de app dezelfde `CRON_SECRET` heeft (na rebuild)
3. Test handmatig met: `curl -X GET "http://localhost:3001/api/cron/sync-cache" -H "Authorization: Bearer <SECRET>"`

### Sync vindt geen studenten
1. Check MinIO credentials in `.env.local`
2. Check of MinIO draait: `docker ps | grep minio`
3. Check app logs: `docker-compose logs | grep -E "students|MinIO"`

