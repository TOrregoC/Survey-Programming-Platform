# Survey Programming Platform

A modular, developer-friendly survey platform — built as a more extensible, API-first alternative to Qualtrics. Combines a no-code builder for non-technical users with a programmable runtime, SDK, webhooks, and custom question types for developers.

## Why

Most survey tools are either too rigid (Qualtrics-style suites) or too limited (basic form builders). This platform separates concerns clearly:

- **Builder**: drag-and-drop editor for non-technical users
- **Runtime**: headless execution engine — can be driven from our UI, embedded apps, or any backend
- **JSON contract**: a single canonical schema for surveys, logic, quotas, and themes
- **Developer Platform**: REST API, SDK, webhooks, custom question types, server-side hooks

## Repository layout

```
apps/
  frontend/   # Next.js 14 builder + admin + respondent UI
  backend/    # Node.js API, runtime, webhooks, jobs

packages/
  shared/     # Shared types, constants, validation utils
  sdk/        # TypeScript SDK — survey runtime + HTTP client
  cli/        # Export/import/scaffolding CLI

docs/         # Architecture, data model, API, SDK, dev setup, roadmap
```

## Quick start

```bash
# Prereqs: Node 18+, Docker, npm 9+

# 1. Install
npm install

# 2. Boot databases
docker-compose up -d

# 3. Configure environment (per workspace)
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.local.example apps/frontend/.env.local

# 4. Generate Prisma client and apply migrations
npm run db:generate
npm run db:migrate

# 5. (optional) seed a demo tenant + admin
npm run db:seed --workspace=apps/backend

# 6. Start all apps in dev
npm run dev
```

- Backend API: http://localhost:5000
- Frontend:    http://localhost:3000

## Documentation

| Doc | Description |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, module breakdown, data flow |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md)     | Entities, relationships, survey JSON schema |
| [docs/API.md](docs/API.md)                   | REST API endpoints and event payloads |
| [docs/SDK.md](docs/SDK.md)                   | SDK usage and runtime extension points |
| [docs/DEV_SETUP.md](docs/DEV_SETUP.md)       | Local development setup and tooling |
| [docs/ROADMAP.md](docs/ROADMAP.md)           | Feature roadmap and milestone plan |

## License

UNLICENSED — internal project for now.
