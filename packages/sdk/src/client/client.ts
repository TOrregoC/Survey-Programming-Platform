import type {
  AnswerValue,
  Survey,
  SurveyResponse,
  SurveySession,
} from "@survey/shared";

export interface SurveyClientOptions {
  baseUrl: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Thin HTTP client over the platform's REST API.
 *
 * Designed for developers embedding surveys in their own apps. Pair with
 * {@link SurveyRuntime} for offline-capable execution.
 */
export class SurveyClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: SurveyClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getSurvey(surveyId: string): Promise<Survey> {
    return this.request<Survey>(`/surveys/${surveyId}`);
  }

  async startSession(
    surveyId: string,
    embeddedData?: Record<string, string | number | boolean>,
  ): Promise<SurveySession> {
    return this.request<SurveySession>(`/runtime/surveys/${surveyId}/start`, {
      method: "POST",
      body: JSON.stringify({ embeddedData: embeddedData ?? {} }),
    });
  }

  async submitAnswer(
    sessionId: string,
    questionId: string,
    value: AnswerValue,
  ): Promise<SurveySession> {
    return this.request<SurveySession>(
      `/runtime/sessions/${sessionId}/answer`,
      {
        method: "POST",
        body: JSON.stringify({ questionId, value }),
      },
    );
  }

  async completeSession(sessionId: string): Promise<SurveyResponse> {
    return this.request<SurveyResponse>(
      `/runtime/sessions/${sessionId}/complete`,
      { method: "POST" },
    );
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("content-type", "application/json");
    if (this.apiKey) headers.set("authorization", `Bearer ${this.apiKey}`);

    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new SurveyClientError(res.status, text || res.statusText);
    }

    return (await res.json()) as T;
  }
}

export class SurveyClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "SurveyClientError";
  }
}
