# Development setup

## Prerequisites
- Node.js 18+ (tested on 22)
- npm 9+
- PostgreSQL 15+ (Docker Compose works; native install also fine)

## First-time setup

```bash
# 1. Install dependencies (npm workspaces)
npm install

# 2. Copy env templates for each workspace
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.local.example apps/frontend/.env.local
# Edit JWT_SECRET and DATABASE_URL in apps/backend/.env if needed.

# 3. Start Postgres (one of):
#    a) Docker
docker-compose up -d
#    b) Native: install Postgres 15+, create user/db
sudo service postgresql start
sudo -u postgres psql -c "CREATE USER survey WITH PASSWORD 'survey' SUPERUSER;"
sudo -u postgres psql -c "CREATE DATABASE survey_dev OWNER survey;"

# 4. Generate Prisma client and apply migrations
npm run db:generate
npm run db:migrate

# 5. Seed a demo tenant + admin user (optional)
npm run db:seed --workspace=apps/backend
#   → email: admin@demo.local
#   → password: password
```

## Day-to-day

```bash
# Run frontend + backend together (turbo)
npm run dev

# Run only one
npm run dev --workspace=apps/backend     # → http://localhost:5000
npm run dev --workspace=apps/frontend    # → http://localhost:3000

# Type-check every workspace
npm run typecheck

# Run backend tests (Vitest)
npm run test --workspace=apps/backend

# Lint, format
npm run lint
npm run format
```

## Database workflows

```bash
# After editing schema.prisma, generate a new migration
npm run db:migrate --workspace=apps/backend

# Visual DB browser
npm run db:studio --workspace=apps/backend

# Re-seed
npm run db:seed --workspace=apps/backend
```

## Why env files per workspace?

Prisma's CLI loads `.env` from the directory containing `schema.prisma`, and
Next.js loads `.env.local` from each app's directory. Keeping them per
workspace means both tools pick the right values without extra plumbing,
and production deploys can scope secrets cleanly.

For the root `.env.example`, see the file — it's a pointer only.

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
