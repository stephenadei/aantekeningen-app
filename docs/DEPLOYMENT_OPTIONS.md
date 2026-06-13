# Deployment - Aantekeningen App

De app wordt gehost via Docker (self-hosted):

## 🐳 Docker Deployment (Self-Hosting)

**Wat het is:**
- Je draait de app zelf op je eigen server/VPS
- Container blijft draaien als een normale server
- Volledige controle over de omgeving

**Wanneer gebruiken:**
- Je hebt al een server/VPS
- Je wilt volledige controle
- Je wilt geen maandelijkse hostingkosten
- Je hebt toegang tot de data lake (via Platform API of S3 op dezelfde server)

**Hoe het werkt:**
```bash
./scripts/docker-start.sh  # Start container
docker compose logs -f      # View logs
docker compose down         # Stop
```

**Voordelen:**
- ✅ Geen hostingkosten
- ✅ Volledige controle
- ✅ Kan Platform API of S3 bereiken
- ✅ Blijft draaien na SSH sluiten

**Nadelen:**
- ❌ Je moet zelf server beheren
- ❌ Geen automatische scaling
- ❌ Je bent verantwoordelijk voor updates

---

## 📋 Huidige Setup

**Actief:**
- ✅ Docker deployment (draait op je server)
- ✅ Data lake (Platform API of S3)
- ✅ Container blijft draaien
- ✅ NGINX reverse proxy voor HTTPS

