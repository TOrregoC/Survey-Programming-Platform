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
import { QuestionRenderer } from "@/components/question-renderer";

type Phase = "loading" | "running" | "complete" | "error";

/**
 * Public respondent page — no auth required. Drives the platform's runtime
 * endpoints (start, answer, complete) and uses {@link SurveyRuntime} from
 * the SDK locally for client-side validation and "what's next?" preview.
 *
 * The backend remains the source of truth: it validates again on each
 * /answer call and is the authority on session state.
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

  const runtime = useMemo(() => (structure ? new SurveyRuntime(structure) : null), [structure]);

  useEffect(() => {
    let cancelled = false;
    api
      .startSession(surveyId)
      .then(({ session, survey }) => {
        if (cancelled) return;
        setStructure(survey.structure);
        setSession(session);
        const rt = new SurveyRuntime(survey.structure);
        const next = rt.getNextQuestion(session);
        if (!next) {
          setPhase("complete");
          return;
        }
        setCurrent({ question: next.question, pipedTitle: next.pipedTitle });
        setPhase("running");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to start survey");
        setPhase("error");
      });
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
      // Allow skipping non-required questions by sending an empty answer.
      // Backend treats undefined value as missing — we send "" so the answer
      // is recorded and the cursor advances.
      const v: AnswerValue = "";
      return submit(v);
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
        setPhase("complete");
        return;
      }
      setCurrent({ question: result.next.question, pipedTitle: result.next.pipedTitle });
      setDraftValue(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit answer");
      setPhase("error");
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
      <h1 className="text-sm uppercase tracking-widest text-slate-500 mb-6">
        {structure.title}
      </h1>

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
