# Implementatie Samenvatting - Metadata naar Datalake

## ✅ Wat is Geïmplementeerd

### 1. Datalake Metadata Service ✅
**Bestand:** `src/lib/datalake-metadata.ts`

Nieuwe service voor metadata opslag in MinIO datalake:
- `getFileMetadata(filePath)` - Leest metadata JSON voor een PDF
- `setFileMetadata(filePath, metadata)` - Schrijft metadata JSON (atomic write)
- `getStudentFileMetadata(studentPath)` - Haalt alle file metadata voor een student op
- `getStudentMetadata(studentPath)` - Leest student metadata
- `setStudentMetadata(studentPath, metadata)` - Schrijft student metadata
- `createFileMetadata()` - Helper om FileMetadata object te maken

**Metadata Structuur:**
- Per PDF: `{filePath}.metadata.json` (bijv. `notability/Priveles/VO/Student/file.pdf.metadata.json`)
- Per student: `{studentPath}/.student.json`

### 2. Background Sync Service Update ✅
**Bestand:** `src/lib/background-sync.ts`

Aangepast om metadata naar datalake te schrijven:
- `syncStudentFiles()` schrijft nu naar datalake i.p.v. alleen Firestore
- Gebruikt `datalakeMetadataService` voor opslag
- Houdt zelfde AI analysis logica
- Metadata wordt opgeslagen naast de bijbehorende PDFs

### 3. Cache Service Update ✅
**Bestand:** `src/lib/cache.ts`

Hybride aanpak: datalake eerst, Firestore als fallback:
- `getFileMetadata()` probeert eerst datalake, valt terug op Firestore
- `setFileMetadata()` schrijft naar beide (datalake primair, Firestore backup)
- Backward compatibility behouden tijdens transitie

### 4. Re-analyse Script ✅
**Bestand:** `scripts/reanalyze-all-to-datalake.mjs`

Script om alle PDFs opnieuw te analyseren:
- Gebruikt API endpoints (`/api/admin/reanalyze`)
- Ondersteunt `--all` (alle studenten) en `--student <naam>` (specifieke student)
- Status check met `--status`
- Vereist app te draaien en admin authenticatie

## 📁 Metadata Structuur in Datalake

```
bronze-education/
└── notability/
    └── Priveles/
        ├── VO/{StudentName}/
        │   ├── file.pdf
        │   ├── file.pdf.metadata.json    # Metadata per PDF
        │   └── .student.json              # Student metadata (optioneel)
        ├── Rekenen/{StudentName}/
        │   └── ...
        └── WO/{StudentName}/
            └── ...
```

## 🔄 Hoe Het Werkt

### Metadata Generatie Flow:

1. **Background Sync** loopt door alle studenten
2. **Voor elke PDF:**
   - Check of metadata bestaat en recent is
   - Als niet recent of niet bestaat → **AI analyse**
   - Genereer metadata object
   - **Schrijf naar datalake** als `{filePath}.metadata.json`

3. **Metadata Lezen:**
   - App probeert eerst datalake
   - Als niet gevonden → fallback naar Firestore
   - Metadata wordt gecached in-memory

### AI Analysis:

- Gebruikt bestaande `analyzeDocumentWithAI()` functie
- Analyseert PDF naam en content (indien beschikbaar)
- Genereert: subject, topic, level, keywords, summary, etc.
- Resultaten worden opgeslagen in metadata JSON

## 🚀 Gebruik

### Re-analyse Alle PDFs:

```bash
# Via script (vereist app te draaien)
node scripts/reanalyze-all-to-datalake.mjs --all

# Of via API (als app draait)
curl -X POST http://localhost:3001/api/admin/reanalyze \
  -H "Content-Type: application/json" \
  -d '{"action": "all", "forceAll": true}'
```

### Re-analyse Specifieke Student:

```bash
node scripts/reanalyze-all-to-datalake.mjs --student "Student Naam"
```

### Check Status:

```bash
node scripts/reanalyze-all-to-datalake.mjs --status
```

## ⚙️ Configuratie

**Environment Variables:**
- `MINIO_ENDPOINT` - MinIO endpoint (default: localhost)
- `MINIO_ACCESS_KEY` - MinIO access key
- `MINIO_SECRET_KEY` - MinIO secret key
- `MINIO_SECURE` - Use SSL (default: false)
- `OPENAI_API_KEY` - Voor AI analyse

## 📊 Voordelen

✅ **Single Source of Truth** - Alles in datalake  
✅ **Geen Firestore Dependency** - Kan later verwijderd worden  
✅ **Metadata naast PDFs** - Logische organisatie  
✅ **Backup Eenvoudig** - Gewoon datalake backup  
✅ **Nieuwe Analyse** - Betere AI resultaten met huidige modellen  
✅ **Backward Compatible** - Firestore blijft als fallback  

## 🔄 Transitie Strategie

**Fase 1 (Nu):**
- ✅ Metadata wordt naar beide geschreven (datalake + Firestore)
- ✅ Lezen probeert eerst datalake, valt terug op Firestore
- ✅ Nieuwe analyses gaan naar datalake

**Fase 2 (Later):**
- Alle metadata in datalake
- Firestore dependency verwijderen
- Alleen datalake gebruiken

## 🧪 Testing

**Test metadata schrijven:**
```bash
# Run background sync
curl -X POST http://localhost:3001/api/admin/sync \
  -d '{"action": "full-sync"}'
```

**Test metadata lezen:**
```bash
# Check of metadata bestaat
curl http://localhost:3001/api/students/{student-id}/files
```

**Verifieer in MinIO:**
```bash
# Check metadata bestanden
docker exec minio mc ls local/bronze-education/notability/Priveles/VO/{StudentName}/
```

## 📝 Volgende Stappen

1. **Test de implementatie:**
   - Run re-analyse script
   - Verifieer metadata wordt geschreven
   - Test app functionaliteit

2. **Monitor:**
   - Check logs voor errors
   - Verifieer metadata integriteit
   - Test performance

3. **Cleanup (Later):**
   - Verwijder Firestore dependency (optioneel)
   - Update documentatie

## ⚠️ Belangrijke Notities

- **Metadata wordt naar beide geschreven** tijdens transitie (datalake + Firestore)
- **Firestore blijft als fallback** voor backward compatibility
- **AI analyse kost tijd en API calls** - re-analyse kan lang duren
- **Script vereist app te draaien** en admin authenticatie

## 🐛 Troubleshooting

**Metadata niet geschreven:**
- Check MinIO connectie
- Check environment variables
- Check logs voor errors

**AI analyse faalt:**
- Check OpenAI API key
- Check API rate limits
- Check logs voor specifieke errors

**Script werkt niet:**
- Check of app draait
- Check admin authenticatie
- Check API URL configuratie

