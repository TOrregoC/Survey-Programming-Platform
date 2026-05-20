# SDK (`@survey/sdk`)

The SDK gives developers two things:

1. `SurveyClient` — a thin HTTP wrapper over the platform's REST API.
2. `SurveyRuntime` — a pure, stateless engine that evaluates a `SurveyDocument` against a session (branching, validation, piping). Run it server-side, in the browser, or offline.

## Install

The SDK is published from the monorepo as `@survey/sdk` and depends on `@survey/shared` for types.

```ts
import { SurveyClient, SurveyRuntime } from "@survey/sdk";
```

## Running a survey end to end

```ts
const client = new SurveyClient({
  baseUrl: "https://api.example.com",
  apiKey: process.env.SURVEY_API_KEY,
});

const { session, survey } = await client.startSession("survey_123", {
  userId: "u_42",
  campaign: "spring-2026",
});

const runtime = new SurveyRuntime(survey.structure);

let next = runtime.getNextQuestion(session);
while (next) {
  const value = await promptUser(next.pipedTitle); // your UI
  const errors = runtime.validateAnswer(next.question.id, value);
  if (errors.length) {
    await showErrors(errors);
    continue;
  }
  const result = await client.submitAnswer(session.sessionId, next.question.id, value);
  next = result.next;
}

await client.completeSession(session.sessionId);
```

## Logic helpers

`SurveyRuntime` exposes the underlying primitives for advanced use cases:

```ts
import { evaluateCondition, interpolatePiping } from "@survey/sdk";

const shouldShow = evaluateCondition(condition, { answers, embeddedData });
const title = interpolatePiping("Hi {{q1}}", pipes, answers);
```

## Validation

```ts
const errors = runtime.validateAnswer("q1", "");
// → ["This question is required"]
```

Validation rules supported (see `ValidationRule` in `@survey/shared`):
- `minLength`, `maxLength`, `pattern` for text
- `min`, `max` for numbers
- type-specific checks (email format, number coercion)

## Extending with custom question types (planned)

A future release will let you register a custom renderer and validator:

```ts
runtime.registerQuestionType("npsv2", {
  validate(value, question) { /* ... */ },
});
```

## Webhook signature verification

If your service receives webhooks from the platform:

```ts
import crypto from "node:crypto";

function verify(secret: string, body: string, signature: string) {
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
```
