# Deployment Opties - Aantekeningen App

Deze app kan op twee manieren worden gehost:

## 🐳 Optie 1: Docker (Self-Hosting)

**Wat het is:**
- Je draait de app zelf op je eigen server/VPS
- Container blijft draaien als een normale server
- Volledige controle over de omgeving

**Wanneer gebruiken:**
- Je hebt al een server/VPS
- Je wilt volledige controle
- Je wilt geen maandelijkse hostingkosten
- Je hebt MinIO/data lake op dezelfde server

**Hoe het werkt:**
```bash
./scripts/docker-start.sh  # Start container
docker compose logs -f      # View logs
docker compose down         # Stop
```

**Voordelen:**
- ✅ Geen hostingkosten
- ✅ Volledige controle
- ✅ Kan MinIO op localhost bereiken
- ✅ Blijft draaien na SSH sluiten

**Nadelen:**
- ❌ Je moet zelf server beheren
- ❌ Geen automatische scaling
- ❌ Je bent verantwoordelijk voor updates

---

## ⚡ Optie 2: Vercel (Serverless)

**Wat het is:**
- Vercel's eigen deployment platform (geen Docker!)
- Serverless functions - schaalt automatisch
- Directe integratie met Next.js (gemaakt door Vercel)

**Wanneer gebruiken:**
- Je wilt geen server beheren
- Je wilt automatische scaling
- Je hebt een budget voor hosting
- Je wilt CI/CD uit de box

**Hoe het werkt:**
1. Push naar GitHub
2. Vercel detecteert automatisch Next.js
3. Bouwt en deployt automatisch
4. Geen Docker nodig!

**Voordelen:**
- ✅ Geen server beheer nodig
- ✅ Automatische scaling
- ✅ CDN wereldwijd
- ✅ Automatische SSL
- ✅ Preview deployments voor elke PR

**Nadelen:**
- ❌ Maandelijkse kosten (gratis tier heeft limieten)
- ❌ Kan MinIO op localhost niet bereiken (moet publiek toegankelijk zijn)
- ❌ Serverless functions hebben timeout limieten

---

## 🔄 Belangrijk Verschil

### Docker Deployment:
```bash
# Je bouwt een Docker image
docker compose build

# Je start een container die blijft draaien
docker compose up -d

# Container draait als normale server
# Kan localhost:9000 (MinIO) bereiken
```

### Vercel Deployment:
```bash
# Je pusht gewoon naar GitHub
git push origin main

# Vercel bouwt automatisch (geen Docker!)
# Vercel gebruikt serverless functions
# Kan GEEN localhost bereiken - MinIO moet publiek zijn
```

---

## 🚨 Belangrijk voor Vercel

Als je naar Vercel gaat, moet je:

1. **MinIO publiek maken** (of Vercel's storage gebruiken)
   - MinIO moet bereikbaar zijn via internet
   - Of gebruik Vercel Blob Storage / S3

2. **Environment Variables instellen in Vercel dashboard**
   - Niet via `.env.local` (dat werkt alleen lokaal)
   - Ga naar Vercel Dashboard → Settings → Environment Variables

3. **Geen Docker gebruiken**
   - Vercel heeft zijn eigen build systeem
   - `vercel.json` configureert de deployment
   - Docker wordt genegeerd door Vercel

---

## 📋 Huidige Setup

**Nu actief:**
- ✅ Docker deployment (draait op je server)
- ✅ MinIO op localhost:9000
- ✅ Container blijft draaien

**Als je naar Vercel gaat:**
- ❌ Docker wordt niet gebruikt
- ⚠️ MinIO moet publiek toegankelijk zijn
- ⚠️ Environment variables moeten in Vercel dashboard

---

## 🎯 Aanbeveling

**Gebruik Docker als:**
- Je al een server hebt
- MinIO op dezelfde server draait
- Je kosten wilt besparen

**Gebruik Vercel als:**
- Je geen server wilt beheren
- Je automatische scaling wilt
- MinIO publiek toegankelijk is (of je Vercel storage gebruikt)

