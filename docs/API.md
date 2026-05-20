# API Reference

Base URL: `http://localhost:5000` in dev. All non-runtime endpoints require an `Authorization: Bearer <token>` header.

## Auth

### POST `/auth/register`
Creates a new tenant + admin user.

Request:
```json
{
  "tenantName": "Acme Research",
  "subdomain": "acme",
  "email": "admin@acme.example",
  "password": "********",
  "name": "Tomas"
}
```
Response `201`: `{ tenant, user, tokens: { access, refresh } }`

### POST `/auth/login`
Request: `{ email, password }` → `{ user, tokens }`

## Surveys

| Method | Path                         | Roles            | Description                          |
| ------ | ---------------------------- | ---------------- | ------------------------------------ |
| POST   | `/surveys`                   | admin, editor    | Create draft survey                  |
| GET    | `/surveys`                   | any              | List surveys for tenant              |
| GET    | `/surveys/:id`               | any              | Get a single survey                  |
| PATCH  | `/surveys/:id`               | admin, editor    | Update title, description, structure |
| DELETE | `/surveys/:id`               | admin            | Delete a survey                      |
| POST   | `/surveys/:id/publish`       | admin, editor    | Snapshot and publish                 |
| POST   | `/surveys/:id/clone`         | admin, editor    | Duplicate a survey                   |

The `structure` field on create / patch must validate against `surveyDocumentSchema` (see `packages/shared/src/utils/validation.ts`).

## Runtime (public — no auth)

| Method | Path                                       | Description                                     |
| ------ | ------------------------------------------ | ----------------------------------------------- |
| POST   | `/runtime/surveys/:id/start`               | Start a session                                 |
| GET    | `/runtime/sessions/:sessionId`             | Get session state + survey structure for resume |
| POST   | `/runtime/sessions/:sessionId/answer`      | Submit a single answer                          |
| POST   | `/runtime/sessions/:sessionId/complete`    | Mark session complete                           |

`start` accepts an optional `embeddedData` object — used for piping, branching, and analytics dimensions.

`start` and `GET sessions/:id` both return the same payload shape so a client can resume a session on page refresh by storing the `sessionId` locally:

```json
{
  "session": { "sessionId": "…", "status": "in_progress", "answers": { … } },
  "survey":  { "id": "…", "title": "…", "structure": { … } }
}
```

## Responses

| Method | Path                       | Roles | Description                       |
| ------ | -------------------------- | ----- | --------------------------------- |
| GET    | `/responses?surveyId=...`  | any   | List responses (filtered)         |
| GET    | `/responses/:id`           | any   | Get a single response             |
| POST   | `/responses/export`        | any   | Export responses as CSV           |

## Webhooks

| Method | Path                     | Roles | Description                                     |
| ------ | ------------------------ | ----- | ----------------------------------------------- |
| POST   | `/webhooks`              | admin | Create subscription (returns secret on create)  |
| GET    | `/webhooks`              | any   | List subscriptions                              |
| PATCH  | `/webhooks/:id`          | admin | Update URL, events, active                      |
| DELETE | `/webhooks/:id`          | admin | Delete subscription                             |
| GET    | `/webhooks/:id/logs`     | any   | View delivery history                           |

### Webhook event types

```
survey.created       survey.published      survey.closed
survey.deleted       response.started      response.answered
response.completed   response.abandoned    quota.reached
webhook.delivered    webhook.failed
```

### Delivery format

Outgoing webhook POST body:
```json
{
  "eventType": "response.completed",
  "payload": { "sessionId": "...", "responseId": "...", "surveyId": "..." },
  "occurredAt": "2026-05-20T10:42:00.000Z"
}
```

Headers:
- `x-survey-event`: event type
- `x-survey-signature`: HMAC-SHA256 hex digest of the raw body using the subscription's `secret`

Failed deliveries retry with exponential backoff (`30s, 1m, 2m, 4m, ...`) up to `WEBHOOK_MAX_RETRIES`.

## Errors

All endpoints return JSON errors in this shape:
```json
{ "error": "Human readable message", "details": { /* optional */ } }
```
- `400` validation
- `401` unauthenticated
- `403` insufficient role
- `404` not found
- `409` state conflict
- `500` unhandled
