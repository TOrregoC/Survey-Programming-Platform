"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SurveyRuntime } from "@survey/sdk";
import type {
  AnswerValue,
  Question,
  SurveyDocument,
  SurveySession,
} from "@survey/shared";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { QuestionRenderer } from "@/components/question-renderer";

type Phase = "loading" | "running" | "complete" | "error";

const STORAGE_PREFIX = "survey.session:";
const storageKey = (surveyId: string) => `${STORAGE_PREFIX}${surveyId}`;

/**
 * Public respondent page — no auth required. Drives the platform's runtime
 * endpoints (start, answer, complete) and uses {@link SurveyRuntime} from
 * the SDK locally for client-side validation and "what's next?" preview.
 *
 * Resumes a session if one is stored in localStorage for this survey. The
 * backend remains the source of truth: it validates again on each /answer
 * call and is the authority on session state.
 */
export default function RunnerPage() {
  const params = useParams<{ surveyId: string }>();
  const surveyId = params.surveyId;

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [structure, setStructure] = useState<SurveyDocument | null>(null);
  const [session, setSession] = useState<SurveySession | null>(null);
  const [current, setCurrent] = useState<{ question: Question; pipedTitle: string } | null>(null);
  const [draftValue, setDraftValue] = useState<AnswerValue | undefined>(undefined);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [resumed, setResumed] = useState(false);

  const runtime = useMemo(() => (structure ? new SurveyRuntime(structure) : null), [structure]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const stored = readStoredSessionId(surveyId);

      if (stored) {
        try {
          const payload = await api.getSession(stored);
          if (cancelled) return;
          // A completed/abandoned session in storage means the respondent
          // already finished — show the thank-you screen instead of
          // silently starting a new submission.
          if (payload.session.status === "completed") {
            clearStoredSessionId(surveyId);
            setPhase("complete");
            return;
          }
          if (payload.session.status === "abandoned") {
            clearStoredSessionId(surveyId);
            // fall through to a fresh start
          } else {
            applyPayload(payload, true);
            return;
          }
        } catch (err) {
          // Session was deleted, expired, or otherwise unreachable — drop
          // the stored id and start fresh below.
          if (err instanceof ApiError && err.status === 404) {
            clearStoredSessionId(surveyId);
          } else {
            if (cancelled) return;
            setError(err instanceof Error ? err.message : "Failed to resume session");
            setPhase("error");
            return;
          }
        }
      }

      try {
        const payload = await api.startSession(surveyId);
        if (cancelled) return;
        writeStoredSessionId(surveyId, payload.session.sessionId);
        applyPayload(payload, false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to start survey");
        setPhase("error");
      }
    }

    function applyPayload(payload: api.RuntimeSurveyPayload, wasResumed: boolean) {
      setStructure(payload.survey.structure);
      setSession(payload.session);
      setResumed(wasResumed);
      const rt = new SurveyRuntime(payload.survey.structure);
      const next = rt.getNextQuestion(payload.session);
      if (!next) {
        // Session reached the end but never called /complete — finalize now.
        // This handles the resumed-but-finished case as well as edge cases
        // where the last submit returned next=null but the page crashed
        // before completing.
        api
          .completeSession(payload.session.sessionId)
          .catch(() => {})
          .finally(() => {
            if (cancelled) return;
            clearStoredSessionId(surveyId);
            setPhase("complete");
          });
        return;
      }
      setCurrent({ question: next.question, pipedTitle: next.pipedTitle });
      setPhase("running");
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [surveyId]);

  if (phase === "loading") {
    return <Centered>Loading survey…</Centered>;
  }
  if (phase === "error") {
    return (
      <Centered>
        <p className="text-red-600">{error}</p>
      </Centered>
    );
  }
  if (phase === "complete") {
    return (
      <Centered>
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Thanks — you&apos;re done.</h1>
          <p className="text-slate-600">Your response has been recorded.</p>
        </div>
      </Centered>
    );
  }

  if (!session || !current || !runtime || !structure) return null;

  const totalQuestions = countQuestions(structure);
  const answered = Object.keys(session.answers).length;
  const progress = Math.min(100, Math.round((answered / Math.max(1, totalQuestions)) * 100));

  const onNext = async () => {
    if (draftValue === undefined && !current.question.required) {
      return submit("" as AnswerValue);
    }
    if (draftValue === undefined) {
      setFieldErrors(["This question is required"]);
      return;
    }
    return submit(draftValue);
  };

  async function submit(v: AnswerValue) {
    if (!runtime || !current || !session) return;
    const errors = runtime.validateAnswer(current.question.id, v);
    if (errors.length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors([]);
    setSubmitting(true);
    try {
      const result = await api.submitAnswer(session.sessionId, current.question.id, v);
      setSession(result.session);
      if (!result.next) {
        await api.completeSession(session.sessionId);
        clearStoredSessionId(surveyId);
        setPhase("complete");
        return;
      }
      setCurrent({ question: result.next.question, pipedTitle: result.next.pipedTitle });
      setDraftValue(undefined);
    } catch (err) {
      // Field-level validation from the server: surface as inline errors
      // so the respondent can retry instead of being kicked to an error page.
      if (
        err instanceof ApiError &&
        err.status === 400 &&
        err.details &&
        typeof err.details === "object" &&
        "details" in err.details &&
        (err.details as { details?: { errors?: string[] } }).details?.errors
      ) {
        setFieldErrors(
          (err.details as { details: { errors: string[] } }).details.errors,
        );
      } else {
        setError(err instanceof Error ? err.message : "Failed to submit answer");
        setPhase("error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const showProgress = structure.settings.showProgress !== false;

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">
      {showProgress && (
        <div className="mb-8 h-1.5 w-full bg-slate-200 rounded">
          <div
            className="h-1.5 bg-brand-600 rounded transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="mb-6 flex items-center justify-between text-sm">
        <span className="uppercase tracking-widest text-slate-500">{structure.title}</span>
        {resumed && (
          <span className="text-xs text-slate-500 italic">resumed where you left off</span>
        )}
      </div>

      <QuestionRenderer
        question={current.question}
        pipedTitle={current.pipedTitle}
        value={draftValue ?? session.answers[current.question.id]}
        onChange={setDraftValue}
        errors={fieldErrors}
      />

      <div className="mt-8 flex items-center justify-end">
        <button
          onClick={onNext}
          disabled={submitting}
          className="rounded-md bg-brand-600 text-white px-5 py-2 font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Next →"}
        </button>
      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center">{children}</div>
    </main>
  );
}

function countQuestions(doc: SurveyDocument): number {
  return doc.blocks.reduce((acc, b) => acc + b.questions.length, 0);
}

function readStoredSessionId(surveyId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(storageKey(surveyId));
  } catch {
    return null;
  }
}

function writeStoredSessionId(surveyId: string, sessionId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(surveyId), sessionId);
  } catch {
    // Storage unavailable (private mode, quota) — resume just won't work.
  }
}

function clearStoredSessionId(surveyId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(surveyId));
  } catch {
    // ignore
  }
}
