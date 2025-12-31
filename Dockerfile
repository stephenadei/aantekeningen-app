# Multi-stage build for Next.js app (Monorepo)
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /workspace

# Copy root package.json and workspace config
COPY package.json package-lock.json* tsconfig.base.json ./
# Copy all package.json files for workspace resolution
COPY packages/database/package.json ./packages/database/
COPY packages/datalake/package.json ./packages/datalake/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY projects/aantekeningen-app/package.json ./projects/aantekeningen-app/
# Install workspace dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /workspace

# Copy node_modules from deps stage
COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/package.json ./package.json
COPY --from=deps /workspace/package-lock.json ./package-lock.json
COPY --from=deps /workspace/tsconfig.base.json ./tsconfig.base.json

# Copy packages source
COPY packages/database ./packages/database
COPY packages/datalake ./packages/datalake
COPY packages/shared-types ./packages/shared-types

# Build packages
WORKDIR /workspace/packages/database
RUN npm run build
RUN npm run db:generate

WORKDIR /workspace/packages/datalake
RUN npm run build

WORKDIR /workspace/packages/shared-types
RUN npm run build

# Copy app source and build
WORKDIR /workspace
COPY projects/aantekeningen-app ./projects/aantekeningen-app

WORKDIR /workspace/projects/aantekeningen-app

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from standalone build
COPY --from=builder --chown=nextjs:nodejs /workspace/projects/aantekeningen-app/public ./public
COPY --from=builder --chown=nextjs:nodejs /workspace/projects/aantekeningen-app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /workspace/projects/aantekeningen-app/.next/static ./projects/aantekeningen-app/.next/static
# Copy workspace packages for runtime
COPY --from=builder --chown=nextjs:nodejs /workspace/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /workspace/packages ./packages

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Next.js standalone puts server.js in projects/aantekeningen-app/
CMD ["node", "projects/aantekeningen-app/server.js"]

