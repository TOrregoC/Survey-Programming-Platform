"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/components/auth-provider";
import * as api from "@/lib/api";
import type {
  Question,
  Survey,
  SurveyDocument,
} from "@survey/shared";

const QUESTION_TEMPLATES: Array<{ label: string; type: Question["type"] }> = [
  { label: "Short text", type: "text" },
  { label: "Long text", type: "long_text" },
  { label: "Multiple choice", type: "multiple_choice" },
  { label: "Number", type: "number" },
  { label: "Rating", type: "rating" },
];

export default function SurveyEditPage() {
  const auth = useRequireAuth();
  const params = useParams<{ id: string }>();
  const surveyId = params.id;
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [structure, setStructure] = useState<SurveyDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!auth) return;
    api
      .getSurvey(auth.token, surveyId)
      .then((s) => {
        setSurvey(s);
        setStructure(s.structure);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [auth?.token, surveyId]); // auth?.token is a stable string; auth object ref changes every render

  if (!auth) return null;
  if (!survey || !structure) {
    return (
      <main className="flex-1 px-6 py-12 max-w-5xl mx-auto w-full text-slate-500">
        {error ?? "Loading…"}
      </main>
    );
  }

  const updateStructure = (next: SurveyDocument) => {
    setStructure(next);
  };

  const onTitleChange = (next: string) => {
    setSurvey({ ...survey, title: next });
    updateStructure({ ...structure, title: next });
  };

  const addQuestion = (type: Question["type"]) => {
    const blockIdx = 0;
    const block = structure.blocks[blockIdx];
    if (!block) return;
    const newQ: Question = {
      id: `q_${Date.now().toString(36)}`,
      type,
      title: defaultTitleFor(type),
      required: false,
      ...(type === "multiple_choice"
        ? {
            choices: [
              { id: `c_${Date.now().toString(36)}_1`, value: "1", text: "Option 1" },
              { id: `c_${Date.now().toString(36)}_2`, value: "2", text: "Option 2" },
            ],
          }
        : {}),
    };
    const next = { ...structure };
    next.blocks = structure.blocks.map((b, idx) =>
      idx === blockIdx ? { ...b, questions: [...b.questions, newQ] } : b,
    );
    updateStructure(next);
  };

  const updateQuestion = (qid: string, patch: Partial<Question>) => {
    updateStructure({
      ...structure,
      blocks: structure.blocks.map((b) => ({
        ...b,
        questions: b.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)),
      })),
    });
  };

  const removeQuestion = (qid: string) => {
    updateStructure({
      ...structure,
      blocks: structure.blocks.map((b) => ({
        ...b,
        questions: b.questions.filter((q) => q.id !== qid),
      })),
    });
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateSurvey(auth.token, surveyId, {
        title: survey.title,
        structure,
      });
      setSurvey(updated);
      setStructure(updated.structure);
      setSavedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onPublish = async () => {
    setPublishing(true);
    setError(null);
    try {
      // Save first so the published snapshot contains latest edits
      await api.updateSurvey(auth.token, surveyId, {
        title: survey.title,
        structure,
      });
      const updated = await api.publishSurvey(auth.token, surveyId);
      setSurvey(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <main className="flex-1 grid grid-cols-12 gap-6 px-6 py-8 max-w-7xl mx-auto w-full">
      <aside className="col-span-3 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold mb-3">Add a question</h2>
          <div className="space-y-2">
            {QUESTION_TEMPLATES.map((t) => (
              <button
                key={t.type}
                onClick={() => addQuestion(t.type)}
                className="w-full text-left rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="font-semibold">Actions</h2>
          <button
            onClick={onSave}
            disabled={saving}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button
            onClick={onPublish}
            disabled={publishing}
            className="w-full rounded-md bg-brand-600 text-white px-3 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            {publishing ? "Publishing…" : "Publish"}
          </button>
          {survey.status === "published" && (
            <Link
              href={`/r/${survey.id}`}
              className="block w-full text-center rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              Open runner →
            </Link>
          )}
          {savedAt && (
            <p className="text-xs text-slate-500">
              Saved {savedAt.toLocaleTimeString()}
            </p>
          )}
          <p className="text-xs">
            Status:{" "}
            <span className="font-medium">{survey.status}</span>
            {survey.version > 1 && (
              <span className="text-slate-500"> · v{survey.version}</span>
            )}
          </p>
        </div>
      </aside>

      <section className="col-span-6 space-y-4">
        {error && (
          <div className="text-sm rounded-md bg-red-50 text-red-700 border border-red-200 px-3 py-2">
            {error}
          </div>
        )}
        <input
          value={survey.title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full text-2xl font-semibold bg-transparent border-b border-slate-200 focus:border-brand-600 outline-none py-2"
        />

        {structure.blocks.map((block) => (
          <div key={block.id} className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {block.title ?? "Block"}
            </p>
            {block.questions.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500 text-center">
                Add a question from the left.
              </div>
            )}
            {block.questions.map((q) => (
              <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5">{q.type}</span>
                  <label className="flex items-center gap-1 ml-auto">
                    <input
                      type="checkbox"
                      checked={!!q.required}
                      onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                    />
                    required
                  </label>
                  <button
                    onClick={() => removeQuestion(q.id)}
                    className="rounded border border-slate-200 px-2 hover:bg-slate-50"
                    aria-label="Remove question"
                  >
                    ×
                  </button>
                </div>
                <input
                  value={q.title}
                  onChange={(e) => updateQuestion(q.id, { title: e.target.value })}
                  className="w-full font-medium text-lg outline-none"
                />
                {q.type === "multiple_choice" && q.choices && (
                  <ul className="mt-3 space-y-1 text-sm">
                    {q.choices.map((c, idx) => (
                      <li key={c.id} className="flex items-center gap-2">
                        <span className="text-slate-400">{idx + 1}.</span>
                        <input
                          value={c.text}
                          onChange={(e) => {
                            const choices = q.choices!.map((cc) =>
                              cc.id === c.id ? { ...cc, text: e.target.value } : cc,
                            );
                            updateQuestion(q.id, { choices });
                          }}
                          className="flex-1 rounded border border-slate-200 px-2 py-1 outline-none focus:border-brand-600"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ))}
      </section>

      <aside className="col-span-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 sticky top-6">
          <h2 className="font-semibold mb-3">Survey JSON</h2>
          <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-[60vh]">
            {JSON.stringify(structure, null, 2)}
          </pre>
        </div>
      </aside>
    </main>
  );
}

function defaultTitleFor(type: Question["type"]): string {
  switch (type) {
    case "text":
      return "Short text question";
    case "long_text":
      return "Long text question";
    case "multiple_choice":
      return "Multiple choice question";
    case "number":
      return "Number question";
    case "rating":
      return "Rating question";
    default:
      return "Question";
  }
}
