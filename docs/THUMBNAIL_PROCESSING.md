# Thumbnail Processing

Thumbnail generatie is verplaatst naar een standalone script dat buiten de app draait. Dit voorkomt dat de app wordt geblokkeerd door zware PDF processing.

## 📋 Overzicht

- **Thumbnails worden opgeslagen in Silver layer**: `silver-education/thumbnails/`
- **Thumbnails worden gegenereerd door**: `scripts/process-thumbnails.mjs`
- **De app haalt alleen thumbnails op**: Geen generatie meer in de app

## 🚀 Thumbnail Processor Script

Het script is onderdeel van het `@stephen/datalake` package en draait onafhankelijk van de app.

### Installatie Dependencies

Het script heeft de volgende dependencies nodig:
- `pdf2pic` (npm package) - geïnstalleerd in datalake package
- `GraphicsMagick` (systeem package)

```bash
# Install GraphicsMagick
sudo apt-get install graphicsmagick  # Ubuntu/Debian
# of
brew install graphicsmagick  # macOS

# Dependencies zijn al geïnstalleerd in datalake package
cd /home/stephen/packages/datalake
npm install
```

### Gebruik

```bash
# Vanuit datalake package directory
cd /home/stephen/packages/datalake

# Alle PDFs verwerken
npm run process-thumbnails
# of
node scripts/process-thumbnails.mjs

# Specifieke folder verwerken
node scripts/process-thumbnails.mjs --folder="notability/Priveles/VO/StudentName"

# Specifiek subject verwerken
node scripts/process-thumbnails.mjs --subject="VO"

# Force regenerate (ook bestaande thumbnails)
node scripts/process-thumbnails.mjs --force

# Combinaties
node scripts/process-thumbnails.mjs --subject="VO" --force
```

### Thumbnail Sizes

Het script genereert automatisch 3 sizes:
- **small**: 200x200px
- **medium**: 400x400px (default)
- **large**: 800x800px

### Thumbnail Locatie

Thumbnails worden opgeslagen in Silver layer:
```
silver-education/
└── thumbnails/
    └── {sanitized_file_path}/
        ├── small.png
        ├── medium.png
        └── large.png
```

Bijvoorbeeld:
```
silver-education/thumbnails/notability_Priveles_VO_Teresa_file_pdf/
├── small.png
├── medium.png
└── large.png
```

## 🔄 Automatische Verwerking

Je kunt de thumbnail processor als cron job instellen:

```bash
# Elke nacht om 2:00 nieuwe thumbnails genereren
0 2 * * * cd /home/stephen/projects/aantekeningen-app && node scripts/process-thumbnails.mjs >> /var/log/thumbnail-processor.log 2>&1
```

Of via systemd timer (zie `scripts/` voor voorbeelden).

## 📱 App Integratie

De app haalt thumbnails op via:
- API: `/api/thumbnail/[fileId]?size=medium`
- Direct: Via `datalakeThumbnailService.getThumbnailUrl(fileId, size)`

Als een thumbnail niet bestaat, wordt een placeholder SVG geretourneerd.

## ✅ Voordelen

1. **App blijft snel**: Geen zware PDF processing in de app
2. **Betere schaalbaarheid**: Thumbnails kunnen parallel worden gegenereerd
3. **Eenvoudiger deployment**: App heeft geen GraphicsMagick nodig
4. **Betere scheiding**: Processing logica gescheiden van app logica

## 🔧 Troubleshooting

### Thumbnail niet gevonden

1. Check of thumbnail bestaat in Silver layer:
```bash
docker exec platform-minio mc ls local/silver-education/thumbnails/
```

2. Run thumbnail processor:
```bash
node scripts/process-thumbnails.mjs --folder="path/to/file"
```

### GraphicsMagick niet gevonden

```bash
# Check installatie
which gm

# Install indien nodig
sudo apt-get install graphicsmagick
```

### pdf2pic errors

```bash
# Reinstall pdf2pic
npm uninstall pdf2pic
npm install pdf2pic@^3.2.0
```

