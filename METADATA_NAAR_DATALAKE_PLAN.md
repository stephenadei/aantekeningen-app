# Metadata naar Datalake - Opnieuw Analyseren Plan

## Doel

Genereer alle metadata opnieuw vanuit de PDFs in de datalake en sla deze op in de datalake zelf. Focus op **nieuwe analyse** i.p.v. migratie van oude Firestore data.

## Huidige Situatie

- **PDFs staan in datalake**: `educatie-lesmateriaal/notability/Priveles/{Subject}/{StudentName}/file.pdf`
- **Metadata staat in Firestore**: fileMetadata collection met AI analyse resultaten
- **Background sync**: Analyseert PDFs en slaat resultaten op in Firestore

## Doel Situatie

- **PDFs blijven in datalake** (geen wijziging)
- **Metadata in datalake**: JSON bestanden naast de PDFs
- **Geen Firestore dependency**: Alles in één plek (datalake)

## Voorgestelde Structuur

### Metadata Bestanden in Datalake:

```
educatie-lesmateriaal/
└── notability/
    └── Priveles/
        ├── VO/{StudentName}/
        │   ├── file.pdf
        │   ├── file.pdf.metadata.json    # Metadata per PDF
        │   └── .student.json              # Student metadata
        ├── Rekenen/{StudentName}/
        │   └── ...
        └── metadata/                      # Globale index
            └── students-index.json        # Snelle lookup index
```

### Metadata Format:

**`{filename}.metadata.json`** (per PDF):
```json
{
  "id": "file-id",
  "name": "filename.pdf",
  "modifiedTime": "2024-01-15T10:30:00Z",
  "size": 12345,
  "checksum": "sha256:...",
  "subject": "wiskunde-a",
  "topicGroup": "algebra-vergelijkingen",
  "topic": "lineaire-vergelijking",
  "level": "vo-havo-onderbouw",
  "schoolYear": "2024-2025",
  "keywords": ["vergelijking", "lineair", "oplossen"],
  "summary": "Les over lineaire vergelijkingen oplossen",
  "summaryEn": "Lesson on solving linear equations",
  "topicEn": "linear-equation",
  "keywordsEn": ["equation", "linear", "solve"],
  "aiAnalyzedAt": "2024-01-15T10:35:00Z",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

**`.student.json`** (per student folder):
```json
{
  "displayName": "Student Naam",
  "subject": "wiskunde-a",
  "path": "VO/StudentNaam",
  "fileCount": 15,
  "lastSynced": "2024-01-15T10:00:00Z"
}
```

## Implementatie Plan

### Fase 1: Datalake Metadata Service

1. **Maak `src/lib/datalake-metadata.ts`**
   - Functies om metadata te lezen/schrijven naar MinIO
   - `getFileMetadata(filePath: string): Promise<FileMetadata>`
   - `setFileMetadata(filePath: string, metadata: FileMetadata): Promise<void>`
   - `getStudentMetadata(studentPath: string): Promise<StudentMetadata>`
   - JSON parsing/stringifying
   - Error handling (graceful degradation als metadata niet bestaat)

2. **Metadata opslag logica**
   - Metadata bestand = `{pdfPath}.metadata.json`
   - Atomic writes (write naar temp, dan rename)
   - Checksum validatie

### Fase 2: Background Sync Service Update

3. **Update `src/lib/background-sync.ts`**
   - Vervang Firestore calls met datalake calls
   - `setFileMetadata()` → schrijf naar datalake JSON
   - `getFileMetadata()` → lees uit datalake JSON
   - Houd zelfde analyse logica (AI analysis blijft hetzelfde)

4. **Sync alle studenten**
   - Loop door alle student folders in datalake
   - Analyseer alle PDFs per student
   - Genereer metadata en sla op in datalake
   - Progress tracking en logging

### Fase 3: App Code Updates

5. **Update `src/lib/cache.ts`**
   - Vervang `getFileMetadata()` om uit datalake te lezen
   - Vervang `setFileMetadata()` om naar datalake te schrijven
   - Houd backward compatibility tijdens transitie

6. **Update API routes**
   - Alle routes die metadata lezen gebruiken datalake
   - Test alle endpoints

### Fase 4: Re-analyse Script

7. **Maak `scripts/reanalyze-all-to-datalake.mjs`**
   - Script dat alle PDFs in datalake opnieuw analyseert
   - Gebruikt bestaande AI analysis logica
   - Slaat metadata op in datalake
   - Progress reporting
   - Resume capability (kan stoppen en verder gaan)

8. **Run re-analyse**
   - Analyseer alle studenten
   - Genereer alle metadata
   - Verifieer data integriteit

### Fase 5: Testing & Cleanup

9. **Test functionaliteit**
   - Test metadata lezen
   - Test metadata schrijven
   - Test AI analysis caching
   - Test performance

10. **Firestore cleanup (optioneel)**
    - Verwijder Firestore dependency uit code
    - Of behoud als fallback tijdens transitie

## Technische Details

### Metadata Service API

```typescript
// Lezen
getFileMetadata(filePath: string): Promise<FileMetadata | null>
getStudentMetadata(studentPath: string): Promise<StudentMetadata | null>
getAllStudents(): Promise<Student[]>

// Schrijven
setFileMetadata(filePath: string, metadata: FileMetadata): Promise<void>
setStudentMetadata(studentPath: string, metadata: StudentMetadata): Promise<void>

// Helpers
fileExists(filePath: string): Promise<boolean>
metadataExists(filePath: string): Promise<boolean>
```

### AI Analysis Flow

1. **Check of metadata bestaat**
   - Als metadata bestaat en recent → skip analyse
   - Als metadata oud of niet bestaat → analyseer

2. **Analyseer PDF**
   - Gebruik bestaande `analyzeDocumentWithAI()` functie
   - Haal PDF content (optioneel, nu alleen filename)
   - Genereer metadata met OpenAI

3. **Sla metadata op**
   - Schrijf naar `{filePath}.metadata.json`
   - Atomic write (temp file → rename)

### Performance Overwegingen

- **Caching**: In-memory cache voor veelgebruikte metadata
- **Batch processing**: Analyseer meerdere bestanden parallel
- **Resume capability**: Script kan stoppen en verder gaan
- **Progress tracking**: Log welke bestanden geanalyseerd zijn

### Error Handling

- **Graceful degradation**: Als metadata niet bestaat, gebruik basis info
- **Retry logic**: Bij AI analysis failures, retry met backoff
- **Logging**: Uitgebreide logging voor debugging

## Voordelen

✅ **Single source of truth** - Alles in datalake  
✅ **Geen externe dependency** - Geen Firebase nodig  
✅ **Versie controle** - Metadata naast bijbehorende PDFs  
✅ **Backup eenvoudig** - Gewoon datalake backup  
✅ **Lokale controle** - Volledige controle over data  
✅ **Nieuwe analyse** - Betere AI resultaten met huidige modellen  

## Risico's & Mitigatie

⚠️ **Performance**: JSON lezen kan langzamer zijn
- **Mitigatie**: In-memory caching, index files

⚠️ **Concurrent writes**: Meerdere processen kunnen conflicteren
- **Mitigatie**: Atomic writes, file locking

⚠️ **AI API costs**: Veel analyses = veel API calls
- **Mitigatie**: Rate limiting, batch processing, resume capability

⚠️ **Data loss**: Bij crash tijdens write
- **Mitigatie**: Atomic writes (temp file → rename)

## Rollout Strategie

1. **Implementeer datalake-metadata.ts** - Basis functionaliteit
2. **Update background-sync.ts** - Schrijf naar datalake
3. **Test met 1 student** - Verifieer alles werkt
4. **Run re-analyse script** - Analyseer alle studenten
5. **Update app code** - Lezen uit datalake
6. **Verificatie** - Test alles werkt
7. **Cleanup** - Verwijder Firestore dependency (optioneel)

## Prioriteiten

**Hoog:**
- Datalake metadata service
- Background sync update
- Re-analyse script

**Medium:**
- App code updates
- Testing

**Laag:**
- Firestore cleanup
- Migratie oude data (optioneel)

