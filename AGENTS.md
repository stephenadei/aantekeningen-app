# AGENTS.md

Codex guidance for `projects/aantekeningen-app`.

## Overview

- Notes and OCR app built with Next.js.
- Uses S3, Prisma, LangChain, and Google Drive integrations.

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run type-check
npm run test
npm run test:unit
npm run test:integration
npm run test:security
npm run test:e2e
npm run test:ci
npm run test:pre-push
```

## Rules

- Shared schema lives in `packages/database`. Do not edit the local Prisma schema copy.
- LangChain and Parquet-related code are server-side only. Never import them into client components.
- Use `src/lib/thumbnail-service.ts` for thumbnail generation. Do not call lower-level PDF/image tools directly from routes.
- Protected routes must verify session access via NextAuth server checks or middleware.
- Use `next-intl` conventions from the workspace root.

## Verification

- Prefer `npm run test:pre-push` for meaningful feature work.
- Use `npm run test:ci` for broad verification when touching multiple subsystems.
