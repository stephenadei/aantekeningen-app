# Quick Fix: MinIO Publiek Maken

## 🎯 Doel

MinIO publiek toegankelijk maken zodat leerlingen bestanden kunnen downloaden via presigned URLs.

## ⚡ Snelle Oplossing (Directe Poort)

### Stap 1: Check MinIO Status

```bash
docker ps | grep minio
```

### Stap 2: Firewall Poort Openen

```bash
# Check huidige firewall status
sudo ufw status

# Open poort 9000
sudo ufw allow 9000/tcp

# Check of het werkt
sudo ufw status numbered
```

### Stap 3: Update Environment Variables

Edit `.env.local`:

```env
# Vervang localhost met je server IP of domain
MINIO_ENDPOINT=144.91.127.229  # Of je domain: minio.stephensprive.app
MINIO_PORT=9000
MINIO_SECURE=false
```

### Stap 4: Herstart Docker Container

```bash
cd /home/stephen/projects/aantekeningen-app
docker compose restart
```

### Stap 5: Test

```bash
# Test MinIO bereikbaarheid (vanaf externe machine)
curl -I http://144.91.127.229:9000

# Test via app
curl "http://localhost:3001/api/test"
```

## 🔒 Betere Oplossing (Reverse Proxy)

Zie `MINIO_PUBLIC_ACCESS.md` voor volledige reverse proxy setup met SSL.

## ⚠️ Belangrijk

**MinIO moet het publieke endpoint gebruiken voor presigned URLs!**

De MinIO client code moet mogelijk aangepast worden om het publieke endpoint te gebruiken in plaats van localhost.

