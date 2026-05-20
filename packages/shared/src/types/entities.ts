import type {
  ResponseStatus,
  SurveyStatus,
  UserRole,
  WebhookEventType,
} from "../constants/questionTypes";
import type { AnswerValue, SurveyDocument } from "./survey";

/**
 * DB entity shapes (mirror Prisma models).
 * Keep these in sync with `apps/backend/prisma/schema.prisma`.
 */

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Survey {
  id: string;
  tenantId: string;
  ownerId: string;
  title: string;
  description: string | null;
  structure: SurveyDocument;
  status: SurveyStatus;
  version: number;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  closedAt: string | null;
}

export interface SurveyVersion {
  id: string;
  surveyId: string;
  versionNumber: number;
  structure: SurveyDocument;
  createdAt: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  surveyVersion: number;
  respondentId: string | null;
  tenantId: string;
  status: ResponseStatus;
  data: Record<string, unknown>;
  answers: Record<string, AnswerValue>;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
}

export interface WebhookSubscription {
  id: string;
  tenantId: string;
  url: string;
  events: WebhookEventType[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookLog {
  id: string;
  subscriptionId: string;
  eventType: WebhookEventType;
  payload: Record<string, unknown>;
  status: "pending" | "delivered" | "failed";
  statusCode: number | null;
  retries: number;
  nextRetryAt: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, unknown> | null;
  createdAt: string;
}
