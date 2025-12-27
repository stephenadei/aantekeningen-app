# Firebase Gebruik in Aantekeningen App

## Overzicht

Firebase wordt gebruikt voor **2 hoofddoelen**:

1. **Firestore Database** - Metadata cache en student data
2. **Firebase Auth** (client-side) - Authenticatie (maar wordt niet veel gebruikt)

## 🔥 1. Firestore Database (Primair Gebruik)

Firestore wordt gebruikt als **metadata cache** en voor student data management.

### Collections in Firestore:

#### 📚 **students** Collection
- Student informatie (naam, subject, drive folder ID)
- Koppeling tussen studenten en Google Drive folders
- Metadata over studenten

#### 📄 **fileMetadata** Collection  
- **Cache van bestandsmetadata** van Google Drive
- AI-analyse resultaten (topics, subjects, key concepts)
- Bestandsnamen, modificatiedatums, checksums
- **Belangrijk**: Dit is een cache - de echte bestanden staan in Google Drive/MinIO

#### 📝 **notes** Collection
- Notities per student
- AI-gegenereerde notities
- Topics en subjects

#### 🔑 **keyConcepts** Collection
- Belangrijke concepten per bestand
- AI-geëxtraheerde termen en uitleg
- Gekoppeld aan specifieke bestanden

#### 🏷️ **studentTags** Collection
- Tags/labels voor studenten
- Categorisering

#### 👨‍🏫 **teachers** Collection
- Docent informatie
- Admin accounts

#### 📂 **unlinkedFolders** Collection
- Google Drive folders die nog niet gekoppeld zijn aan studenten

#### 🔐 **loginAudits** Collection
- Login logs voor security/auditing

### Waarom Firestore?

**Primair als Cache:**
- Snelle toegang tot metadata zonder Google Drive API calls
- AI-analyse resultaten opslaan (duur om opnieuw te berekenen)
- Performance optimalisatie

**Student Data:**
- Student informatie en koppelingen
- Notities en key concepts

## 🔐 2. Firebase Auth (Client-Side)

Firebase Auth wordt geïnitialiseerd maar **wordt niet veel gebruikt** in de huidige implementatie.

- Client-side authenticatie setup
- Analytics tracking
- **Maar**: De app gebruikt voornamelijk **NextAuth** voor authenticatie

## 📊 Data Flow

```
Google Drive/MinIO (echte bestanden)
    ↓
Firestore Cache (metadata, AI analysis)
    ↓
App API (serveert data aan frontend)
```

## ⚠️ Belangrijk

### Firestore is OPTIONEEL voor Basis Functionaliteit

De app kan werken **zonder Firestore**:
- Bestanden worden direct uit Google Drive/MinIO gehaald
- Firestore is alleen voor **performance/caching**

### Maar Firestore is NUTTIG voor:

1. **AI Analysis Cache**
   - AI-analyse is duur (OpenAI API calls)
   - Resultaten worden in Firestore opgeslagen
   - Zonder Firestore: AI-analyse moet elke keer opnieuw

2. **Performance**
   - Snellere laadtijden (geen Google Drive API calls nodig)
   - Metadata caching

3. **Student Management**
   - Student informatie en koppelingen
   - Notities en key concepts

## 🔧 Conclusie

**Firebase is nodig voor:**
- ✅ Metadata caching (fileMetadata collection)
- ✅ AI analysis results storage
- ✅ Student data management
- ✅ Performance optimalisatie

**Firebase is NIET nodig voor:**
- ❌ Bestandsopslag (dat gebeurt in Google Drive/MinIO)
- ❌ Basis functionaliteit (app kan zonder werken, maar langzamer)

## 💡 Aanbeveling

**Behoud Firebase** omdat:
1. AI-analyse cache belangrijk is (bespaart kosten en tijd)
2. Performance verbetering
3. Student data management

**Maar**: Als je Firebase wilt verwijderen, kan de app werken zonder - alleen langzamer en zonder AI cache.

