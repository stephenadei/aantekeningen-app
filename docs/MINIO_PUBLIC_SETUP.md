# MinIO Publiek Maken - Alleen Educatie Bucket

## 🎯 Doel

MinIO publiek maken zodat leerlingen bestanden kunnen downloaden, maar **alleen de `educatie-lesmateriaal` bucket** is publiek leesbaar.

## ✅ Stap 1: MinIO Bucket Policy Configureren

Run het script om alleen de educatie bucket publiek te maken:

```bash
cd /home/stephen/projects/aantekeningen-app
./scripts/setup-minio-public.sh
```

Dit script:
- ✅ Configureert MinIO client (mc)
- ✅ Zet alleen `educatie-lesmateriaal` bucket op publiek leesbaar
- ✅ Andere buckets blijven privé
- ✅ Alleen `GetObject` toegang (download, geen upload/delete)

## ✅ Stap 2: MinIO Publiek Bereikbaar Maken

### Optie A: Nginx Reverse Proxy (Aanbevolen)

```bash
# Setup nginx reverse proxy
./scripts/setup-minio-nginx.sh minio.stephensprive.app 144.91.127.229

# DNS record toevoegen (bij je DNS provider):
# minio.stephensprive.app -> 144.91.127.229
```

**Voordelen:**
- ✅ Veilig (MinIO zelf blijft op localhost)
- ✅ SSL mogelijk (certbot)
- ✅ Domain name (niet IP adres)

### Optie B: Directe Poort (Sneller, minder veilig)

```bash
# Firewall poort openen
sudo ufw allow 9000/tcp

# Check status
sudo ufw status
```

**Nadelen:**
- ❌ MinIO direct blootgesteld
- ❌ Geen SSL (tenzij MinIO zelf SSL configureert)
- ❌ IP adres in plaats van domain

## ✅ Stap 3: Environment Variables Updaten

Edit `.env.local`:

```env
# Voor nginx reverse proxy (optie A)
MINIO_ENDPOINT=minio.stephensprive.app
MINIO_PORT=80  # Of 443 voor HTTPS
MINIO_SECURE=false  # Of true voor HTTPS

# Voor directe poort (optie B)
MINIO_ENDPOINT=144.91.127.229
MINIO_PORT=9000
MINIO_SECURE=false
```

## ✅ Stap 4: Docker Container Herstarten

```bash
cd /home/stephen/projects/aantekeningen-app
docker compose restart
```

## 🧪 Testen

### Test 1: MinIO Bereikbaarheid

```bash
# Vanaf externe machine
curl -I http://minio.stephensprive.app
# Of
curl -I http://144.91.127.229:9000
```

### Test 2: Bucket Policy

```bash
# Check bucket policy
mc anonymous get local-minio/educatie-lesmateriaal

# Moet "download" tonen (publiek leesbaar)
```

### Test 3: Presigned URL Test

```bash
# Test via app API
curl "http://localhost:3001/api/test"

# Check of presigned URLs het juiste endpoint bevatten
# (niet localhost, maar publiek endpoint)
```

### Test 4: Bestand Downloaden

1. Open app in browser
2. Zoek een student
3. Klik op "Downloaden"
4. Check of bestand downloadt
5. Check URL: moet publiek endpoint bevatten (niet localhost)

## 🔒 Beveiliging

### Wat is Publiek:

✅ **Publiek leesbaar:**
- `educatie-lesmateriaal` bucket
- Alleen `GetObject` (download)
- Via presigned URLs (tijdelijk, 7 dagen geldig)

❌ **Privé (niet publiek):**
- Alle andere buckets
- Upload/delete acties
- MinIO console (poort 9001)
- MinIO admin functies

### Extra Beveiliging:

1. **MinIO Access Keys beveiligen**
   - Gebruik sterke wachtwoorden
   - Rotate regelmatig
   - Nooit in Git committen

2. **Rate Limiting (nginx)**
   ```nginx
   limit_req_zone $binary_remote_addr zone=minio_limit:10m rate=10r/s;
   
   location / {
       limit_req zone=minio_limit burst=20;
       # ... rest of config
   }
   ```

3. **SSL Certificaat (aanbevolen)**
   ```bash
   sudo certbot --nginx -d minio.stephensprive.app
   ```

## 📋 Checklist

- [ ] MinIO bucket policy geconfigureerd (alleen educatie bucket)
- [ ] MinIO publiek bereikbaar (nginx of directe poort)
- [ ] Environment variables geüpdatet
- [ ] Docker container herstart
- [ ] Test: MinIO bereikbaar vanaf internet
- [ ] Test: Presigned URLs bevatten publiek endpoint
- [ ] Test: Bestand downloaden werkt
- [ ] SSL certificaat geconfigureerd (optioneel)
- [ ] Rate limiting geconfigureerd (optioneel)

## 🐛 Troubleshooting

**Presigned URLs bevatten nog steeds localhost:**
- Check `MINIO_ENDPOINT` environment variable
- Herstart Docker container
- Check MinIO client logs

**Bestanden niet bereikbaar:**
- Check firewall regels
- Check nginx configuratie
- Check MinIO logs: `docker logs minio`
- Check bucket policy: `mc anonymous get local-minio/educatie-lesmateriaal`

**Bucket policy werkt niet:**
- Check of bucket bestaat: `mc ls local-minio/educatie-lesmateriaal`
- Check policy: `mc anonymous get local-minio/educatie-lesmateriaal`
- Herstel policy: `mc anonymous set download local-minio/educatie-lesmateriaal`

