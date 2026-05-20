"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6"
      >
        <h1 className="text-2xl font-semibold">Log in</h1>

        {error && (
          <div className="text-sm rounded-md bg-red-50 text-red-700 border border-red-200 px-3 py-2">
            {error}
          </div>
        )}

        <label className="block">
          <span className="text-sm text-slate-700">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-600"
            autoComplete="email"
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-700">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-600"
            autoComplete="current-password"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-brand-600 text-white py-2 font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Log in"}
        </button>

        <p className="text-sm text-slate-600 text-center">
          No account?{" "}
          <Link href="/register" className="text-brand-700 hover:underline">
            Create one
          </Link>
        </p>
      </form>
    </main>
  );
}
