"use client";

import type { AnswerValue, Question } from "@survey/shared";

interface Props {
  question: Question;
  pipedTitle: string;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  errors?: string[];
}

/**
 * Renders a question for a respondent. Minimal first pass — covers text,
 * long_text, number, email, multiple_choice, and rating. Custom types can
 * be added later via a registry without changing the runner.
 */
export function QuestionRenderer({ question, pipedTitle, value, onChange, errors }: Props) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xl font-semibold">
        {pipedTitle}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </legend>
      {question.description && (
        <p className="text-sm text-slate-600">{question.description}</p>
      )}

      <Body question={question} value={value} onChange={onChange} />

      {errors && errors.length > 0 && (
        <ul className="text-sm text-red-600 list-disc list-inside">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

function Body({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
}) {
  switch (question.type) {
    case "text":
    case "email":
    case "url":
      return (
        <input
          type={question.type === "text" ? "text" : question.type}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-600"
        />
      );

    case "long_text":
      return (
        <textarea
          rows={4}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-600"
        />
      );

    case "number":
      return (
        <input
          type="number"
          value={typeof value === "number" ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-600"
        />
      );

    case "multiple_choice":
      return (
        <div className="space-y-2">
          {(question.choices ?? []).map((c) => (
            <label
              key={c.id}
              className={
                "flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer " +
                (value === c.value
                  ? "border-brand-600 bg-brand-50"
                  : "border-slate-200 hover:bg-slate-50")
              }
            >
              <input
                type="radio"
                name={question.id}
                checked={value === c.value}
                onChange={() => onChange(c.value)}
              />
              {c.text}
            </label>
          ))}
        </div>
      );

    case "checkbox":
      return (
        <div className="space-y-2">
          {(question.choices ?? []).map((c) => {
            const selected = Array.isArray(value) ? value.includes(c.value) : false;
            return (
              <label
                key={c.id}
                className={
                  "flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer " +
                  (selected
                    ? "border-brand-600 bg-brand-50"
                    : "border-slate-200 hover:bg-slate-50")
                }
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => {
                    const current = Array.isArray(value) ? value : [];
                    onChange(
                      e.target.checked
                        ? [...current, c.value]
                        : current.filter((v) => v !== c.value),
                    );
                  }}
                />
                {c.text}
              </label>
            );
          })}
        </div>
      );

    case "rating": {
      const max = 5;
      const current = typeof value === "number" ? value : 0;
      return (
        <div className="flex gap-1">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={
                "w-10 h-10 rounded-md border text-sm font-medium " +
                (n <= current
                  ? "bg-brand-600 text-white border-brand-600"
                  : "border-slate-300 hover:bg-slate-50")
              }
            >
              {n}
            </button>
          ))}
        </div>
      );
    }

    case "statement":
      return null;

    default:
      return (
        <input
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-600"
        />
      );
  }
}
