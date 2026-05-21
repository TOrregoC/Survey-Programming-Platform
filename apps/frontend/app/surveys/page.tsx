"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/components/auth-provider";
import * as api from "@/lib/api";

export default function SurveysPage() {
  const auth = useRequireAuth();
  const router = useRouter();
  const [surveys, setSurveys] = useState<api.SurveyListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!auth) return;
    api
      .listSurveys(auth.token)
      .then(setSurveys)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [auth?.token]);

  if (!auth) return null;

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const survey = await api.createSurvey(auth.token, { title: title.trim() });
      router.push(`/surveys/${survey.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create survey");
      setCreating(false);
    }
  };

  return (
    <main className="flex-1 px-6 py-12 max-w-5xl mx-auto w-full">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Your surveys</h1>
          <p className="text-slate-600 mt-1">
            All surveys for your tenant. Build, publish, and analyze.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-brand-600 text-white px-4 py-2 font-medium hover:bg-brand-700"
        >
          {showForm ? "Cancel" : "New survey"}
        </button>
      </header>

      {showForm && (
        <form
          onSubmit={onCreate}
          className="mb-6 rounded-xl border border-slate-200 bg-white p-4 flex gap-3"
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Survey title"
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-600"
            required
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-brand-600 text-white px-4 py-2 font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </form>
      )}

      {error && (
        <div className="mb-4 text-sm rounded-md bg-red-50 text-red-700 border border-red-200 px-3 py-2">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white">
        {surveys === null ? (
          <div className="p-6 text-slate-500 text-sm">Loading…</div>
        ) : surveys.length === 0 ? (
          <div className="p-6 text-slate-500 text-sm">
            No surveys yet — create one above.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {surveys.map((s) => (
              <li key={s.id} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/surveys/${s.id}`}
                    className="font-medium hover:text-brand-700"
                  >
                    {s.title}
                  </Link>
                  {s.description && (
                    <p className="text-sm text-slate-500 truncate">{s.description}</p>
                  )}
                </div>
                <span
                  className={
                    "text-xs uppercase tracking-wide rounded px-2 py-0.5 " +
                    (s.status === "published"
                      ? "bg-green-50 text-green-700"
                      : s.status === "draft"
                        ? "bg-slate-100 text-slate-600"
                        : "bg-amber-50 text-amber-700")
                  }
                >
                  {s.status}
                </span>
                {s.status === "published" && (
                  <Link
                    href={`/r/${s.id}`}
                    className="text-sm text-brand-700 hover:underline"
                  >
                    Open runner →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
