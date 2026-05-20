/**
 * Minimal fetch wrapper for the platform's REST API.
 *
 * The frontend talks to the backend over a JWT bearer token issued by
 * /auth/login or /auth/register. Token storage is handled by the auth
 * provider (see components/auth-provider.tsx) — this module is pure I/O.
 */

import type {
  AnswerValue,
  Survey,
  SurveyDocument,
  SurveyResponse,
  SurveySession,
} from "@survey/shared";

// Defaults to "" so all requests use relative URLs proxied by Next.js (next.config.mjs rewrites).
// Set NEXT_PUBLIC_API_BASE_URL to hit the backend directly (e.g. in automated tests).
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { token?: string | null; raw?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body != null) {
    headers.set("content-type", "application/json");
  }
  if (init.token) {
    headers.set("authorization", `Bearer ${init.token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    let detail: unknown = text;
    try {
      detail = JSON.parse(text);
    } catch {
      // leave detail as the raw text
    }
    const message =
      (detail && typeof detail === "object" && "error" in detail
        ? String((detail as { error: unknown }).error)
        : null) ?? res.statusText;
    throw new ApiError(res.status, message, detail);
  }
  if (init.raw) return (await res.text()) as unknown as T;
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

// ---------- auth ----------

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "editor" | "viewer";
  tenantId?: string;
}

export interface AuthPayload {
  user: AuthUser;
  tokens: { access: string; refresh: string };
}

export async function register(input: {
  tenantName: string;
  subdomain: string;
  email: string;
  password: string;
  name: string;
}): Promise<AuthPayload> {
  const data = await request<{
    tenant: { id: string; name: string; subdomain: string };
    user: AuthUser;
    tokens: { access: string; refresh: string };
  }>("/auth/register", { method: "POST", body: JSON.stringify(input) });
  return {
    user: { ...data.user, tenantId: data.tenant.id },
    tokens: data.tokens,
  };
}

export async function login(email: string, password: string): Promise<AuthPayload> {
  return request<AuthPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// ---------- surveys ----------

export interface SurveyListItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  updatedAt: string;
  publishedAt: string | null;
}

export async function listSurveys(token: string): Promise<SurveyListItem[]> {
  const { data } = await request<{ data: SurveyListItem[] }>("/surveys", { token });
  return data;
}

export async function createSurvey(
  token: string,
  body: { title: string; description?: string },
): Promise<Survey> {
  return request<Survey>("/surveys", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function getSurvey(token: string, id: string): Promise<Survey> {
  return request<Survey>(`/surveys/${id}`, { token });
}

export async function updateSurvey(
  token: string,
  id: string,
  patch: { title?: string; description?: string; structure?: SurveyDocument },
): Promise<Survey> {
  return request<Survey>(`/surveys/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(patch),
  });
}

export async function publishSurvey(token: string, id: string): Promise<Survey> {
  return request<Survey>(`/surveys/${id}/publish`, { method: "POST", token });
}

// ---------- runtime (public) ----------

export interface RuntimeSurveyPayload {
  session: SurveySession;
  survey: { id: string; title: string; structure: SurveyDocument };
}

export async function startSession(
  surveyId: string,
  embeddedData?: Record<string, string | number | boolean>,
): Promise<RuntimeSurveyPayload> {
  return request("/runtime/surveys/" + surveyId + "/start", {
    method: "POST",
    body: JSON.stringify({ embeddedData: embeddedData ?? {} }),
  });
}

export async function getSession(sessionId: string): Promise<RuntimeSurveyPayload> {
  return request(`/runtime/sessions/${sessionId}`);
}

export async function submitAnswer(
  sessionId: string,
  questionId: string,
  value: AnswerValue,
): Promise<{ session: SurveySession; next: { blockId: string; question: import("@survey/shared").Question; pipedTitle: string } | null }> {
  return request(`/runtime/sessions/${sessionId}/answer`, {
    method: "POST",
    body: JSON.stringify({ questionId, value }),
  });
}

export async function completeSession(sessionId: string): Promise<SurveyResponse> {
  return request<SurveyResponse>(`/runtime/sessions/${sessionId}/complete`, {
    method: "POST",
  });
}

// ---------- responses ----------

export async function listResponses(
  token: string,
  surveyId?: string,
): Promise<SurveyResponse[]> {
  const path = surveyId ? `/responses?surveyId=${surveyId}` : "/responses";
  const { data } = await request<{ data: SurveyResponse[] }>(path, { token });
  return data;
}
