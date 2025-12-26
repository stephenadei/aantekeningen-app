# Migratie naar Privelessen Dashboard

Deze documentatie beschrijft de migratie van Firestore naar privelessen-dashboard voor student beheer.

## 📋 Overzicht

**Wat wordt gemigreerd:**
- PIN login verificatie
- Student metadata (PIN hashes, datalake paths)
- Admin student beheer (optioneel)

**Wat blijft in Firestore:**
- AI metadata cache (fileMetadata)
- Audit logs (loginAudits)
- Drive cache (tijdelijk, kan later weg)

## 🔧 Setup

### 1. Privelessen Dashboard

#### Database Migration
```bash
cd /home/stephen/projects/privelessen-dashboard
npx prisma migrate dev --name add_aantekeningen_fields
npx prisma generate
```

#### API Endpoints
De volgende endpoints zijn beschikbaar:
- `GET /api/students/by-name/[name]` - Zoek student op naam
- `POST /api/students/verify-pin` - Verifieer PIN

### 2. Aantekeningen App

#### Environment Variable
Voeg toe aan `.env.local`:
```env
DASHBOARD_API_URL=http://localhost:4141
```

Voor productie:
```env
DASHBOARD_API_URL=https://dashboard.stephensprivelessen.nl
```

## 🔄 Migratie Status

### ✅ Voltooid

1. **Privelessen Dashboard**
   - Student model uitgebreid met `pinHash` en `datalakePath`
   - API endpoints voor PIN verificatie

2. **Aantekeningen App**
   - PIN login gemigreerd naar dashboard API
   - Fallback naar Firestore als dashboard niet beschikbaar

3. **AI Data Scripts**
   - `check-ai-data-status.mjs` - Check AI metadata status
   - `regenerate-ai-data.mjs` - Regenerate AI data

### ⏳ Optioneel

- Admin student beheer migreren naar dashboard API
- Firestore volledig verwijderen (na migratie)

## 🧪 Testen

### 1. Test PIN Login
```bash
# Start privelessen-dashboard
cd /home/stephen/projects/privelessen-dashboard
npm run dev

# Test PIN login in aantekeningen-app
curl -X POST http://localhost:3001/api/leerling/login \
  -H "Content-Type: application/json" \
  -d '{"displayName": "Amirah", "pin": "123456"}'
```

### 2. Check AI Data Status
```bash
cd /home/stephen/projects/aantekeningen-app
node scripts/check-ai-data-status.mjs
```

### 3. Regenerate AI Data
```bash
cd /home/stephen/projects/aantekeningen-app
node scripts/regenerate-ai-data.mjs
```

## 📊 Data Migratie

### PIN Hashes Migreren

Om bestaande PIN hashes van Firestore naar privelessen-dashboard te migreren:

1. Exporteer studenten uit Firestore met PIN hashes
2. Importeer in privelessen-dashboard database
3. Koppel `datalakePath` aan student records

### Datalake Path Mapping

De `datalakePath` moet de volledige pad zijn naar de student folder in MinIO:
```
notability/Priveles/VO/Amirah
```

Dit wordt gebruikt om:
- Student te koppelen aan datalake
- File metadata op te halen
- Bestanden te vinden

## 🔒 Security

- PIN hashes worden opgeslagen als bcrypt hashes
- PIN verificatie gebeurt server-side
- Dashboard API moet beveiligd zijn (authenticatie)

## 🐛 Troubleshooting

**PIN login werkt niet:**
- Check of `DASHBOARD_API_URL` correct is ingesteld
- Check of privelessen-dashboard draait
- Check of student bestaat in dashboard database

**AI data status check faalt:**
- Check of MinIO credentials correct zijn
- Check of Firestore credentials correct zijn
- Check of OpenAI API key is ingesteld (voor analyse)

## 📝 Volgende Stappen

1. ✅ Run Prisma migration in privelessen-dashboard
2. ✅ Test PIN login
3. ✅ Migreer bestaande PIN hashes
4. ✅ Run AI data status check
5. ✅ Run AI data regeneratie
6. ⏳ Migreer admin beheer (optioneel)
7. ⏳ Verwijder Firestore dependencies (optioneel)

