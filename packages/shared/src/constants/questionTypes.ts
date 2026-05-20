/**
 * Canonical question types supported by the runtime.
 * Custom types can be registered via the plugin system in the runtime.
 */
export const QUESTION_TYPES = [
  "text",
  "long_text",
  "number",
  "email",
  "url",
  "date",
  "multiple_choice",
  "checkbox",
  "dropdown",
  "rating",
  "scale",
  "ranking",
  "matrix",
  "file_upload",
  "signature",
  "nps",
  "constant_sum",
  "slider",
  "statement",
  "custom",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export const LOGIC_OPERATORS = [
  "==",
  "!=",
  ">",
  ">=",
  "<",
  "<=",
  "in",
  "not_in",
  "contains",
  "not_contains",
  "is_empty",
  "is_not_empty",
] as const;

export type LogicOperator = (typeof LOGIC_OPERATORS)[number];

export const SURVEY_STATUSES = [
  "draft",
  "published",
  "closed",
  "archived",
] as const;

export type SurveyStatus = (typeof SURVEY_STATUSES)[number];

export const RESPONSE_STATUSES = [
  "started",
  "in_progress",
  "completed",
  "abandoned",
] as const;

export type ResponseStatus = (typeof RESPONSE_STATUSES)[number];

export const USER_ROLES = ["admin", "editor", "viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const WEBHOOK_EVENT_TYPES = [
  "survey.created",
  "survey.published",
  "survey.closed",
  "survey.deleted",
  "response.started",
  "response.answered",
  "response.completed",
  "response.abandoned",
  "quota.reached",
  "webhook.delivered",
  "webhook.failed",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];
