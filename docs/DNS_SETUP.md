# DNS Setup - MinIO Publiek Toegankelijk

## 📋 Vereiste DNS Records

### 1. MinIO Reverse Proxy (Verplicht)

Om MinIO publiek toegankelijk te maken via `minio.stephensprive.app`:

**DNS Record:**
```
Type:  A
Name:  minio
Value: 144.91.127.229
TTL:   3600 (of default)
```

**Resultaat:**
- `minio.stephensprive.app` wijst naar `144.91.127.229`
- Leerlingen kunnen bestanden downloaden via presigned URLs

---

## 🔧 Waar DNS Records Toevoegen?

### Cloudflare
1. Log in op Cloudflare dashboard
2. Selecteer `stephensprive.app` domain
3. Ga naar **DNS** → **Records**
4. Klik **Add record**
5. Vul in:
   - Type: `A`
   - Name: `minio`
   - IPv4 address: `144.91.127.229`
   - Proxy status: Off (grijze wolk) of On (oranje wolk)
   - TTL: Auto
6. Klik **Save**

### Andere DNS Providers
1. Log in op je DNS provider (bijv. Namecheap, GoDaddy, etc.)
2. Ga naar DNS Management / DNS Records
3. Voeg A record toe:
   - Host: `minio`
   - Type: `A`
   - Value: `144.91.127.229`
   - TTL: `3600` (of default)

---

## 🧪 Verificatie

### Test DNS Record

```bash
# Check DNS record
dig minio.stephensprive.app
# of
nslookup minio.stephensprive.app

# Test HTTP verbinding
curl -I http://minio.stephensprive.app
```

**Verwacht resultaat:**
- DNS lookup moet `144.91.127.229` teruggeven
- HTTP request moet `200 OK` of `400 Bad Request` geven (MinIO API)

### Test vanuit App

```bash
# Test presigned URL
curl "http://localhost:3001/api/students/search?q=Amirah" | jq '.students[0]'
# Check of downloadUrl minio.stephensprive.app bevat
```

---

## ⏱️ DNS Propagation

- **Tijd:** 5-60 minuten (meestal < 15 minuten)
- **Cloudflare:** Meestal binnen 1-2 minuten
- **Andere providers:** 15-60 minuten

**Check propagation:**
```bash
# Vanaf verschillende locaties
dig @8.8.8.8 minio.stephensprive.app
dig @1.1.1.1 minio.stephensprive.app
```

---

## 🔒 SSL Certificaat (Na DNS)

Zodra DNS werkt, voeg SSL toe:

```bash
sudo certbot --nginx -d minio.stephensprive.app
```

Update `.env.local`:
```env
MINIO_PORT=443
MINIO_SECURE=true
```

Herstart container:
```bash
docker compose restart
```

---

## 📋 Optionele DNS Records

### App Domain (als je de app ook publiek wilt)

Als je de aantekeningen-app ook via een domain wilt bereikbaar maken:

**DNS Record:**
```
Type:  A
Name:  aantekeningen (of app, of @)
Value: 144.91.127.229
TTL:   3600
```

**Nginx Config nodig:**
- Reverse proxy voor poort 3001
- SSL certificaat
- Zie `DEPLOYMENT.md` voor details

---

## 🐛 Troubleshooting

### DNS Record werkt niet

1. **Check DNS record:**
   ```bash
   dig minio.stephensprive.app
   ```

2. **Check nginx config:**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

3. **Check firewall:**
   ```bash
   sudo ufw status
   # Poort 80 en 443 moeten open zijn
   ```

### MinIO niet bereikbaar

1. **Check MinIO container:**
   ```bash
   docker ps | grep minio
   ```

2. **Check nginx logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Test direct:**
   ```bash
   curl -I http://localhost:9000
   ```

---

## ✅ Checklist

- [ ] DNS A record toegevoegd: `minio.stephensprive.app -> 144.91.127.229`
- [ ] DNS propagation gewacht (5-60 minuten)
- [ ] DNS record geverifieerd: `dig minio.stephensprive.app`
- [ ] HTTP test: `curl -I http://minio.stephensprive.app`
- [ ] Presigned URLs testen in app
- [ ] SSL certificaat toegevoegd (optioneel)
- [ ] Environment variables geüpdatet voor HTTPS (als SSL gebruikt)

