# Roadmap

## MVP — Phase 1

| Status | Item                                                         |
| ------ | ------------------------------------------------------------ |
| ✅     | Monorepo scaffold (frontend, backend, shared, sdk, cli)      |
| ✅     | Canonical `SurveyDocument` JSON schema (TS + Zod)            |
| ✅     | Prisma schema for Tenant, User, Survey, SurveyVersion, Response, Webhooks, AuditLog, ApiKey |
| ✅     | JWT auth (register, login, role-based middleware)            |
| ✅     | Survey CRUD + publish + clone                                |
| ✅     | Runtime endpoints (start, get state, submit answer, complete) |
| ✅     | Headless `SurveyRuntime` (branching, display logic, piping, validation) |
| ✅     | Webhook subscriptions + signed delivery worker with retries  |
| ✅     | CSV export of responses                                      |
| ✅     | Minimal Next.js builder, surveys list, landing page          |
| ✅     | Vitest coverage of the runtime engine                        |

## Phase 2 — Developer features

- [ ] Survey versioning UI + "publish new version" flow
- [ ] Custom question type plugin API on `SurveyRuntime`
- [ ] Server-side hooks (`onResponseStarted`, `onResponseCompleted`, `onAnswerSubmitted`)
- [ ] Quotas enforcement in runtime
- [ ] Randomization (block / choice) locked in at session start
- [ ] Audit log writes from every mutating service
- [ ] API key management UI + tenant-scoped programmatic access
- [ ] GraphQL endpoint alongside REST

## Phase 3 — Polish & scale

- [ ] Real-time response dashboard with charts
- [ ] Theme editor (logo, colors, fonts)
- [ ] Multi-language surveys
- [ ] SSO (SAML / OIDC)
- [ ] Offline-capable SDK (queue + sync)
- [ ] Public marketplace for templates and custom question types
- [ ] On-prem / private cloud deployment guide

## Non-functional

- [ ] CI: typecheck + test + lint + build on PR
- [ ] Containerization (Dockerfiles for backend + frontend)
- [ ] Observability: OpenTelemetry traces, metrics endpoint
- [ ] WCAG 2.1 AA audit of respondent runner
- [ ] Load test runtime endpoints (target: 200 RPS per node)
