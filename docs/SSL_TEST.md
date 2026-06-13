# SSL Test Checklist

## ✅ Server-side Tests (Automatisch)

### Test 1: Direct HTTPS naar Server
```bash
curl -I https://platform-minio.stephensprivelessen.nl
```
**Verwacht:** HTTP/2 400 (normaal voor MinIO zonder specifieke request)

### Test 2: Via Cloudflare
```bash
curl -I https://platform-minio.stephensprivelessen.nl
```
**Verwacht:** 
- `server: cloudflare`
- `cf-ray:` header aanwezig
- Geen 526 error

### Test 3: SSL Certificaat Validatie
```bash
openssl s_client -connect platform-minio.stephensprivelessen.nl:443 -servername platform-minio.stephensprivelessen.nl
```
**Verwacht:** `Verify return code: 0 (ok)`

### Test 4: Thumbnail API
```bash
curl -I "http://localhost:3001/api/thumbnail/notability%2FPriveles%2FVO%2FTeresa%2FEindproefwerk%20VWO%203%20-%202425%20-%20Oefenproefwerk%20(1).pdf?size=medium"
```
**Verwacht:** `location: https://platform-minio.stephensprivelessen.nl/...`

### Test 5: Presigned URL Direct
```bash
# Haal presigned URL op
THUMB_URL=$(curl -s "http://localhost:3001/api/thumbnail/..." -I | grep location | cut -d' ' -f2)

# Test de URL
curl -I "$THUMB_URL"
```
**Verwacht:** 
- HTTP/2 200 of 206 (success)
- `Content-Type: image/png`
- Geen 526 error

## 🌐 Browser Tests (Handmatig)

### Test 6: Browser SSL Check
1. Open: `https://platform-minio.stephensprivelessen.nl`
2. Check browser:
   - ✅ Geen SSL warnings
   - ✅ Groen slotje in adresbalk
   - ✅ Certificaat details tonen "Let's Encrypt"

### Test 7: Thumbnail in App
1. Open app: `http://localhost:3001` (of publieke URL)
2. Navigeer naar student bestanden
3. Check:
   - ✅ Thumbnails worden getoond
   - ✅ Geen broken images
   - ✅ Geen console errors over SSL

### Test 8: Cloudflare SSL Mode Check
1. Ga naar Cloudflare Dashboard → SSL/TLS
2. Check mode voor `platform-minio.stephensprivelessen.nl`:
   - ✅ Moet "Full (strict)" zijn
   - ✅ Geen warnings

## 🔧 Troubleshooting

### 526 Error (Invalid SSL Certificate)
**Oorzaak:** Cloudflare kan origin server niet bereiken via HTTPS
**Oplossing:** 
- Check of SSL certificaat op server geldig is
- Check of Nginx SSL correct is geconfigureerd
- Zet Cloudflare mode op "Full (strict)"

### Presigned URLs werken niet
**Oorzaak:** URL signature mismatch of SSL probleem
**Oplossing:**
- Check of presigned URLs HTTPS gebruiken
- Test URL direct in browser
- Check app logs voor errors

### Thumbnails worden niet getoond
**Oorzaak:** CORS, SSL, of URL problemen
**Oplossing:**
- Check browser console voor errors
- Test presigned URL direct
- Check of thumbnail bestaat in MinIO

## 📊 Status Check Script

Run dit script om alle tests automatisch uit te voeren:

```bash
#!/bin/bash
echo "=== SSL Test Suite ==="
echo ""

echo "1. Testing direct HTTPS..."
curl -sI https://platform-minio.stephensprivelessen.nl | head -3

echo ""
echo "2. Testing SSL certificate..."
echo | openssl s_client -connect platform-minio.stephensprivelessen.nl:443 -servername platform-minio.stephensprivelessen.nl 2>&1 | grep "Verify return code"

echo ""
echo "3. Testing thumbnail API..."
curl -sI "http://localhost:3001/api/thumbnail/notability%2FPriveles%2FVO%2FTeresa%2FEindproefwerk%20VWO%203%20-%202425%20-%20Oefenproefwerk%20(1).pdf?size=medium" | grep location

echo ""
echo "✅ Tests completed!"
```

