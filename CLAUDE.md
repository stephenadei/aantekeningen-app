# CLAUDE.md — aantekeningen-app

**Room:** Notes & OCR
**Domain:** tutoring / work
**Language:** TypeScript (Next.js 16)

PDF notes management, OCR processing, AI-powered analysis, and student notebook organization. Integrates with S3 (Bronze/Silver), Prisma, LangChain, and Google Drive.

---

## Commands

```bash
npm run dev              # Dev server on :3000
npm run build            # Production build
npm run lint             # ESLint
npm run type-check       # tsc --noEmit (via package.json)

# Tests
npm run test             # Unit tests (Vitest)
npm run test:unit        # Unit only
npm run test:integration # Integration tests
npm run test:security    # Security suite
npm run test:e2e         # Playwright e2e
npm run test:ci          # Full suite: unit + integration + security + e2e + performance
npm run test:pre-push    # Lint + unit + integration + security

# Run single test
npx vitest run tests/unit/myfile.test.ts
npx vitest run --reporter=verbose

# Data scripts
npm run generate-thumbnails      # Generate PDF thumbnails
npm run reanalyze                # Re-run AI analysis on notes
npm run seed-subjects            # Seed subject taxonomy
```

---

## Architecture

```
src/
├── app/
│   ├── api/             # Route Handlers — admin, auth, cron, download, leerling,
│   │                    #   metadata, share, students, taxonomy, thumbnail
│   └── [pages]          # App Router pages
├── lib/
│   ├── auth.ts          # NextAuth config
│   ├── datalake-sync.ts # Bronze → Silver sync
│   ├── silver-processor.ts  # Silver enrichment
│   ├── thumbnail-service.ts # PDF → image thumbnails
│   ├── security.ts      # Auth + rate limiting
│   └── services/        # Business logic services
└── components/
```

```
docs/                  # Project-specific guides (auth, deployment, cron, testing, datalake, etc.)
├── archive/           # Historical Firebase migration docs
prisma/                # Legacy local schema copy — DO NOT EDIT (SSOT is packages/database)
├── schema.prisma      # Unified schema (read-only reference)
└── migrations/        # Local migration history
```

**Database:** `@stephenadei/database` (shared Prisma schema — never edit local schema).
**AI:** LangChain + OpenAI GPT-4o — server-side only; never import in client components.
**Storage:** S3 via `@stephenadei/datalake`; Bronze = raw PDFs; Silver = enriched metadata.

---

## Agent routing

**Primary agents:** 03-implementer, 13-data-ai-analyst | **Skills:** `repo-research`, `implementation-planning`, `schema-auditing`

---

## Key rules

- **LangChain and ParquetJS are server-side only** — webpack externalizes them; never import in `'use client'` components.
- **Shared schema:** Prisma changes go in `packages/database` — run `npm run db:generate` here after changes.
- **Thumbnails:** always use `thumbnail-service.ts` — never call pdf2pic or sharp directly from routes.
- **Auth:** all protected routes must check session via `getServerSession(authOptions)` or NextAuth middleware.
- **i18n:** next-intl — see root `CLAUDE.md` for import conventions.
- **Tests:** `test:pre-push` must pass before any push. `test:ci` for full coverage.
