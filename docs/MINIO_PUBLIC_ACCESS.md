# MinIO Publiek Toegankelijk Maken voor Leerlingen

## 🚨 Probleem

De app gebruikt **presigned URLs** van MinIO om bestanden te delen met leerlingen. Deze URLs bevatten het MinIO endpoint (`localhost:9000`), wat niet bereikbaar is vanaf internet.

**Gevolg:** Leerlingen kunnen bestanden niet downloaden/bekijken.

## ✅ Oplossing: MinIO Publiek Maken

Er zijn twee opties:

### Optie 1: Reverse Proxy (Aanbevolen)

MinIO achter een reverse proxy (nginx/traefik) met SSL:

1. **MinIO blijft op localhost:9000** (veilig)
2. **Reverse proxy exposeert MinIO via publiek domein** (bijv. `minio.stephensprive.app`)
3. **SSL certificaat** voor beveiligde verbinding
4. **MinIO client gebruikt publiek endpoint** voor presigned URLs

**Voordelen:**
- ✅ Veilig (MinIO zelf niet direct blootgesteld)
- ✅ SSL/HTTPS ondersteuning
- ✅ Kan rate limiting toevoegen
- ✅ Kan authenticatie toevoegen

### Optie 2: Directe Poort Forwarding

MinIO direct via publiek IP/poort toegankelijk maken:

1. **Firewall poort 9000 openen**
2. **MinIO configureren met publiek IP**
3. **MinIO client gebruikt publiek IP** voor presigned URLs

**Nadelen:**
- ❌ Minder veilig (MinIO direct blootgesteld)
- ❌ Geen SSL (tenzij MinIO zelf SSL configureert)
- ❌ Moeilijker om te beveiligen

---

## 🔧 Implementatie: Optie 1 (Reverse Proxy)

### Stap 1: Nginx Configuratie

Maak een nginx configuratie voor MinIO:

```nginx
# /etc/nginx/sites-available/minio.stephensprive.app
server {
    listen 80;
    server_name minio.stephensprive.app;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name minio.stephensprive.app;

    ssl_certificate /etc/letsencrypt/live/minio.stephensprive.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/minio.stephensprive.app/privkey.pem;

    # MinIO requires large request body
    client_max_body_size 1000M;

    location / {
        proxy_pass http://localhost:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # MinIO specific headers
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # WebSocket support (for MinIO console)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }
}
```

### Stap 2: SSL Certificaat

```bash
# SSL certificaat aanvragen
sudo certbot --nginx -d minio.stephensprive.app

# Nginx herstarten
sudo systemctl restart nginx
```

### Stap 3: MinIO Client Configuratie

Update `.env.local`:

```env
# MinIO Configuration
MINIO_ENDPOINT=https://minio.stephensprive.app
MINIO_PORT=443
MINIO_SECURE=true
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=your-secret-key
```

**Belangrijk:** De MinIO client moet het **publieke endpoint** gebruiken voor presigned URLs!

### Stap 4: MinIO Client Code Aanpassen

De MinIO client moet het publieke endpoint gebruiken voor presigned URLs. Check `src/lib/datalake-simple.ts`:

```typescript
// De client moet het publieke endpoint gebruiken
const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
// Als endpoint een URL is (https://minio.stephensprive.app), gebruik die
// Anders gebruik localhost voor interne connecties
```

---

## 🔧 Implementatie: Optie 2 (Directe Poort)

### Stap 1: Firewall Poort Openen

```bash
# UFW (Ubuntu)
sudo ufw allow 9000/tcp

# Of iptables
sudo iptables -A INPUT -p tcp --dport 9000 -j ACCEPT
```

### Stap 2: MinIO Configureren

MinIO moet weten wat zijn publieke URL is. Dit kan via environment variables:

```bash
# In MinIO container
MINIO_BROWSER_REDIRECT_URL=https://your-server-ip:9000
```

### Stap 3: Environment Variables

```env
# MinIO Configuration
MINIO_ENDPOINT=your-server-ip  # Of domain name
MINIO_PORT=9000
MINIO_SECURE=false  # Of true als je SSL configureert
```

---

## 🧪 Testen

### Test 1: MinIO Bereikbaarheid

```bash
# Vanaf externe machine
curl -I http://minio.stephensprive.app
# Of
curl -I http://your-server-ip:9000
```

### Test 2: Presigned URL Test

```bash
# Test via API
curl "http://localhost:3001/api/test"
# Check of presigned URLs het juiste endpoint bevatten
```

### Test 3: Bestand Downloaden

1. Open app in browser
2. Zoek een student
3. Klik op "Downloaden"
4. Check of bestand downloadt (niet "localhost:9000" in URL)

---

## 🔒 Beveiliging

### Belangrijk:

1. **MinIO Access Keys beveiligen**
   - Gebruik sterke wachtwoorden
   - Rotate regelmatig
   - Nooit in Git committen

2. **Bucket Policies**
   - Configureer bucket policies voor read-only access
   - Gebruik presigned URLs (tijdelijk, veilig)

3. **Rate Limiting**
   - Voeg rate limiting toe in nginx
   - Voorkom abuse

4. **Monitoring**
   - Monitor MinIO logs
   - Check voor verdachte activiteit

---

## 📋 Checklist

- [ ] MinIO publiek toegankelijk (via reverse proxy of direct)
- [ ] SSL certificaat geconfigureerd
- [ ] Environment variables geüpdatet
- [ ] MinIO client gebruikt publiek endpoint
- [ ] Presigned URLs bevatten publiek endpoint
- [ ] Test: Bestand downloaden werkt
- [ ] Firewall regels geconfigureerd
- [ ] Monitoring ingesteld

---

## 🐛 Troubleshooting

**Presigned URLs bevatten nog steeds localhost:**
- Check `MINIO_ENDPOINT` environment variable
- Herstart Docker container
- Check MinIO client initialisatie

**Bestanden niet bereikbaar:**
- Check firewall regels
- Check nginx configuratie
- Check MinIO logs: `docker logs minio`

**SSL errors:**
- Check certificaat geldigheid
- Check nginx SSL configuratie
- Check MinIO `MINIO_SECURE` setting

