# Architecture

## Goals

Build a survey platform that is easy enough for non-technical users to ship a survey in five minutes, but flexible enough for developers to embed surveys, write custom question types, and integrate the platform into their own stack.

Concretely, the platform must:

- Separate the **builder** (UI for editing), the **runtime** (logic engine), and the **storage layer** (DB) so they can evolve independently.
- Treat **survey content as JSON** — one canonical document type powers the builder, the runtime, the SDK, and storage.
- Be **multi-tenant** from day one.
- Be **API-first**: anything the UI does, the API can do.
- Be **extensible**: webhooks, custom question types, server-side hooks, SDK.

## High-level diagram

```
            ┌─────────────────────────────┐
            │       Frontend (Next.js)    │
            │  Builder · Admin · Runner   │
            └─────────────┬───────────────┘
                          │  REST + JWT
            ┌─────────────▼───────────────┐
            │     Backend (Node/Express)  │
            │  Auth · Surveys · Runtime · │
            │  Responses · Webhooks       │
            └─────┬──────────────┬────────┘
                  │              │
        ┌─────────▼───┐    ┌─────▼──────┐
        │ PostgreSQL  │    │  Webhooks  │
        │ (Prisma)    │    │  worker    │
        └─────────────┘    └────────────┘

  Shared packages (packages/*):
    - @survey/shared  →  types, constants, JSON validation
    - @survey/sdk     →  SurveyRuntime + SurveyClient (used by frontend + 3p)
    - @survey/cli     →  export/import/validate CLI
```

## Modules

### 1. Survey Builder (frontend)
- Drag-and-drop editor for blocks and questions
- Real-time JSON preview
- Theming and settings panel
- Logic editor (skip, display, piping)
- Versioning UI (read-only history)

### 2. Survey Runtime (`@survey/sdk` + backend)
- Pure, stateless engine over `SurveyDocument`
- Resolves: next question, display logic, branching, piping, validation
- Can run server-side (backend runtime endpoints) or client-side (SDK in 3p apps)

### 3. Response Engine (backend)
- Session lifecycle: start → in_progress → completed / abandoned
- Persists answers to the `Response` table on completion (snapshot model)
- Enforces quotas (Phase 2)
- Emits webhook events on lifecycle transitions

### 4. Developer Platform (backend + packages)
- REST API (see `docs/API.md`)
- Webhook subscriptions with HMAC-signed deliveries and retry queue
- TypeScript SDK (`@survey/sdk`)
- CLI (`@survey/cli`) for export, import, and validation
- Custom question types via the runtime's plugin hook (planned)

### 5. Admin & Security (backend + frontend)
- JWT-based auth with refresh tokens
- Tenant isolation enforced in every service query
- Role-based access (admin / editor / viewer)
- Audit logging (Phase 2)
- API keys for programmatic access (Phase 2)

## Data flow: capturing a single response

1. Respondent hits `POST /runtime/surveys/:id/start`
2. Backend creates a `RuntimeSession` and emits `response.started`
3. Frontend (or SDK) calls `POST /runtime/sessions/:id/answer` for each question
4. Backend validates the answer with the runtime, persists it, and emits `response.answered`
5. On `POST /runtime/sessions/:id/complete`, backend transacts: marks session completed, writes a `Response` row, emits `response.completed`
6. Webhook worker picks up pending `WebhookLog` rows and POSTs them out with HMAC signatures

## Why JSON for the survey body

A traditional schema (one row per question, one row per choice, etc.) makes versioning, cloning, exporting, and diffing surveys painful. Storing the entire `SurveyDocument` as a single JSON blob means:

- One write to publish or revert
- Easy import/export and templating
- Versioning is `INSERT SELECT structure` into `SurveyVersion`
- The same JSON drives builder, runtime, SDK, and external integrations

Answers are stored as `Record<questionId, value>` for the same reason — analytics queries operate over JSON paths.

## What's deliberately out of scope (for MVP)

- GraphQL (REST only for now)
- Real-time multi-cursor collaboration in the builder
- ML-driven question suggestions
- Self-hosted plugin registry
- Mobile SDKs
