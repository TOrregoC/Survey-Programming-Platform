# Development setup

## Prerequisites
- Node.js 18+
- npm 9+
- Docker + Docker Compose (for Postgres + Redis)

## First-time setup

```bash
# 1. Install dependencies (monorepo workspaces)
npm install

# 2. Copy environment file and edit JWT_SECRET / DATABASE_URL if needed
cp .env.example .env

# 3. Start Postgres and Redis
docker-compose up -d

# 4. Generate Prisma client and apply migrations
npm run db:generate
npm run db:migrate

# 5. (optional) Seed a demo tenant + admin user
npm run db:seed --workspace=apps/backend
```

## Day-to-day

```bash
# Run frontend + backend together
npm run dev

# Run only one
npm run dev --workspace=apps/backend
npm run dev --workspace=apps/frontend

# Type-check the whole repo
npm run typecheck

# Run backend tests (Vitest)
npm run test --workspace=apps/backend

# Lint
npm run lint

# Format
npm run format
```

## Database workflows

```bash
# Create a new migration after editing schema.prisma
npm run db:migrate --workspace=apps/backend

# Visual DB browser
npm run db:studio --workspace=apps/backend

# Re-seed
npm run db:seed --workspace=apps/backend
```

## CLI

```bash
# From inside packages/cli
npx tsx src/main.ts validate path/to/survey.json
npx tsx src/main.ts export <surveyId> --out ./exported.json
```

## Folder cheatsheet

```
apps/backend     → Express + Prisma + Vitest
apps/frontend    → Next.js 14 (App Router) + Tailwind
packages/shared  → Types, constants, Zod schemas (source of truth)
packages/sdk     → Runtime engine + HTTP client
packages/cli     → @survey/cli commands
docs/            → Architecture, API, data model, SDK, dev setup
```

## Useful URLs (dev)

- Frontend: http://localhost:3000
- Backend:  http://localhost:5000
- Health:   http://localhost:5000/healthz
- Prisma Studio: opened by `npm run db:studio`
