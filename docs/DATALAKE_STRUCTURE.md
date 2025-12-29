# Data Lake Structuur - Aantekeningen App

## 📦 Bucket Overzicht

### Hoofd Bucket: `bronze-education`

Dit is de bucket die gebruikt wordt door de aantekeningen-app. Deze bucket bevat alle lesmateriaal voor studenten.

**Andere buckets** (niet gebruikt door deze app):
- `embeddings/` - Vector embeddings voor AI/ML
- `processed-text/` - Verwerkte tekst data
- `raw-chatwoot/` - Chatwoot CRM data
- `raw-email/` - Email backups
- `raw-notability/` - Legacy Notability exports
- `raw-website/` - Website form submissions
- `raw-whatsapp/` - WhatsApp exports

---

## 📁 Pad Structuur

```
bronze-education/
└── notability/
    └── Priveles/
        ├── VO/          # Wiskunde A/B (Voortgezet Onderwijs)
        ├── Rekenen/     # Rekenen basis
        └── WO/          # Wiskunde (Wetenschappelijk Onderwijs)
```

### Subject Folders

1. **VO/** - Wiskunde A/B
   - Voor voortgezet onderwijs studenten
   - Subject type: `wiskunde-a` of `wiskunde-b`

2. **Rekenen/** - Rekenen basis
   - Voor rekenen basis niveau
   - Subject type: `rekenen-basis`

3. **WO/** - Wiskunde
   - Voor wetenschappelijk onderwijs
   - Subject type: `wiskunde-a`

---

## 👥 Student Structuur

Elke student heeft een eigen folder onder een subject folder:

```
{Subject}/{StudentName}/
├── bestand1.pdf
├── bestand2.pdf
└── ...
```

### Voorbeeld

```
bronze-education/notability/Priveles/VO/Amirah/
├── Note 26 Aug 2024 (2).pdf
├── Priveles 9 May 2025 15_10_49.pdf
├── Privéles 10 Sep 2024.pdf
├── Privéles 3 Oct 2024.pdf
└── Privéles 7 Oct 2024 17_46_43.pdf
```

---

## 🔧 Code Configuratie

In `src/lib/datalake-simple.ts`:

```typescript
const BUCKET_NAME = 'bronze-education';
const BASE_PATH = 'notability/Priveles';
```

### Subject Mapping

```typescript
const subjectMap: Record<string, string> = {
  'wiskunde-a': 'VO',
  'wiskunde-b': 'VO',
  'rekenen': 'Rekenen',
  'wo': 'WO',
};
```

---

## 📊 Volledige Pad Voorbeelden

### Student Pad
```
bronze-education/notability/Priveles/VO/Amirah/
```

### Bestand Pad
```
bronze-education/notability/Priveles/VO/Amirah/Note 26 Aug 2024 (2).pdf
```

---

## 🔒 Beveiliging

### Publieke Toegang

Alleen de `bronze-education` bucket is publiek leesbaar voor downloads:
- ✅ Publiek leesbaar (download)
- ❌ Geen upload toegang
- ❌ Geen delete toegang
- ❌ Andere buckets blijven privé

### Bucket Policy

```bash
mc anonymous set download local/bronze-education
```

Dit maakt alleen `GetObject` (download) toegankelijk voor iedereen, maar alleen binnen deze bucket.

---

## 📋 Bestand Types

De app ondersteunt:
- `.pdf` - PDF bestanden (primair)
- `.note` - Notability bestanden (worden gefilterd als PDF bestaat)
- `.notability` - Notability exports

---

## 🧪 Testen

### Check Bucket Structuur

```bash
# Alle buckets
docker exec minio mc ls local/

# Subject folders
docker exec minio mc ls local/bronze-education/notability/Priveles/

# Student folders
docker exec minio mc ls local/bronze-education/notability/Priveles/VO/

# Bestanden
docker exec minio mc ls local/bronze-education/notability/Priveles/VO/Amirah/
```

### Check Bucket Policy

```bash
docker exec minio mc anonymous get local/bronze-education
```

Moet `download` tonen voor publieke lees toegang.

