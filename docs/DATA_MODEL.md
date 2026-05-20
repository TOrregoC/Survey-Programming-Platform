# Data Model

The DB schema lives in [`apps/backend/prisma/schema.prisma`](../apps/backend/prisma/schema.prisma). The canonical TypeScript types for survey JSON live in [`packages/shared/src/types/survey.ts`](../packages/shared/src/types/survey.ts) and are validated by Zod schemas in [`packages/shared/src/utils/validation.ts`](../packages/shared/src/utils/validation.ts).

## Entity overview

| Entity                | Purpose                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| `Tenant`              | Top-level isolation boundary                                           |
| `User`                | A person inside a tenant (admin / editor / viewer)                     |
| `Survey`              | A survey draft or published survey, with JSON `structure`              |
| `SurveyVersion`       | Immutable structure snapshot, written on publish                       |
| `RuntimeSession`      | In-flight respondent session — accumulates answers                     |
| `Response`            | Completed (or abandoned) response, snapshotted from a session          |
| `WebhookSubscription` | Tenant-owned webhook target                                            |
| `WebhookLog`          | Per-delivery row (pending, delivered, failed) with HMAC signing meta   |
| `ApiKey`              | Hashed API keys for programmatic access                                |
| `AuditLog`            | Tenant audit trail                                                     |

## Relationships

```
Tenant 1──* User
Tenant 1──* Survey
Tenant 1──* Response
Tenant 1──* WebhookSubscription
Tenant 1──* ApiKey
Tenant 1──* AuditLog

User 1──* Survey (ownerId)

Survey 1──* SurveyVersion
Survey 1──* RuntimeSession
Survey 1──* Response

RuntimeSession 1──1 Response   (response is created on completion)
WebhookSubscription 1──* WebhookLog
```

## Canonical `SurveyDocument` JSON

Stored on `Survey.structure` (and snapshotted on `SurveyVersion.structure`). The shape is enforced by Zod and TypeScript:

```ts
interface SurveyDocument {
  id: string;
  title: string;
  description?: string;
  blocks: Block[];
  logic: LogicRule[];
  quotas: QuotaRule[];
  settings: SurveySettings;
}
```

See `packages/shared/src/types/survey.ts` for full definitions of `Block`, `Question`, `LogicRule`, `QuotaRule`, and `SurveySettings`.

### Example

```json
{
  "id": "survey-123",
  "title": "Customer Satisfaction",
  "blocks": [
    {
      "id": "b1",
      "title": "Intro",
      "questions": [
        { "id": "q1", "type": "text", "title": "Your name?", "required": true },
        {
          "id": "q2",
          "type": "multiple_choice",
          "title": "How satisfied?",
          "choices": [
            { "id": "c1", "value": "5", "text": "Very satisfied" },
            { "id": "c2", "value": "1", "text": "Very dissatisfied" }
          ]
        }
      ]
    }
  ],
  "logic": [
    {
      "id": "skip1",
      "type": "skip_to_block",
      "condition": {
        "operator": "==",
        "left": { "type": "response", "questionId": "q2" },
        "right": { "type": "value", "value": "1" }
      },
      "action": { "skipToBlockId": "b3" }
    }
  ],
  "quotas": [],
  "settings": { "showProgress": true, "progressBarType": "percentage" }
}
```

## Multi-tenant isolation

Every domain row carries `tenantId`. Service-layer code derives `tenantId` from the JWT `auth` context attached by `requireAuth` middleware (see `apps/backend/src/middleware/auth.ts`). All Prisma queries must filter by `tenantId` — there is no global "admin" path.

## Versioning model

- Editing a draft mutates `Survey.structure` in place.
- Publishing copies `Survey.structure` into a new `SurveyVersion` row and sets `status = published`.
- Responses store `surveyVersion` so analytics survives later edits to the master structure.
- A future "publish new version" flow will increment `Survey.version` and write a fresh `SurveyVersion` while preserving prior responses.
