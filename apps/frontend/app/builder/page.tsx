"use client";

import { useState } from "react";
import type { Block, Question, SurveyDocument } from "@survey/shared";

const initialSurvey: SurveyDocument = {
  id: "draft",
  title: "Untitled survey",
  blocks: [
    {
      id: "b1",
      title: "Default block",
      questions: [],
    },
  ],
  logic: [],
  quotas: [],
  settings: { showProgress: true, progressBarType: "percentage" },
};

const QUESTION_TEMPLATES: Array<{ label: string; type: Question["type"] }> = [
  { label: "Short text", type: "text" },
  { label: "Long text", type: "long_text" },
  { label: "Multiple choice", type: "multiple_choice" },
  { label: "Number", type: "number" },
  { label: "Rating", type: "rating" },
];

/**
 * Minimal first-pass survey builder. Demonstrates the JSON-as-contract
 * approach: every edit produces a valid SurveyDocument shape that the
 * backend, runtime, and SDK all consume directly.
 */
export default function BuilderPage() {
  const [survey, setSurvey] = useState<SurveyDocument>(initialSurvey);

  const addQuestion = (type: Question["type"]) => {
    setSurvey((s) => ({
      ...s,
      blocks: s.blocks.map((b, idx) =>
        idx === 0
          ? {
              ...b,
              questions: [
                ...b.questions,
                {
                  id: `q_${b.questions.length + 1}`,
                  type,
                  title: defaultTitleFor(type),
                  required: false,
                  ...(type === "multiple_choice"
                    ? {
                        choices: [
                          { id: "c1", value: "1", text: "Option 1" },
                          { id: "c2", value: "2", text: "Option 2" },
                        ],
                      }
                    : {}),
                },
              ],
            }
          : b,
      ),
    }));
  };

  const updateQuestion = (qid: string, patch: Partial<Question>) => {
    setSurvey((s) => ({
      ...s,
      blocks: s.blocks.map((b) => ({
        ...b,
        questions: b.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)),
      })),
    }));
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
      </aside>

      <section className="col-span-6 space-y-4">
        <input
          value={survey.title}
          onChange={(e) => setSurvey((s) => ({ ...s, title: e.target.value }))}
          className="w-full text-2xl font-semibold bg-transparent border-b border-slate-200 focus:border-brand-600 outline-none py-2"
        />
        {survey.blocks.map((block: Block) => (
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
                      onChange={(e) =>
                        updateQuestion(q.id, { required: e.target.checked })
                      }
                    />
                    required
                  </label>
                </div>
                <input
                  value={q.title}
                  onChange={(e) => updateQuestion(q.id, { title: e.target.value })}
                  className="w-full font-medium text-lg outline-none"
                />
              </div>
            ))}
          </div>
        ))}
      </section>

      <aside className="col-span-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 sticky top-6">
          <h2 className="font-semibold mb-3">Survey JSON</h2>
          <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-[60vh]">
            {JSON.stringify(survey, null, 2)}
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
