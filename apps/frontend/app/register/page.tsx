"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    tenantName: "",
    subdomain: "",
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6"
      >
        <h1 className="text-2xl font-semibold">Create your workspace</h1>
        <p className="text-sm text-slate-600">
          Set up your tenant and the first admin user.
        </p>

        {error && (
          <div className="text-sm rounded-md bg-red-50 text-red-700 border border-red-200 px-3 py-2">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-slate-700">Workspace name</span>
            <input
              required
              value={form.tenantName}
              onChange={set("tenantName")}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-600"
              placeholder="Acme Research"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-700">Subdomain</span>
            <input
              required
              value={form.subdomain}
              onChange={set("subdomain")}
              pattern="[a-z0-9-]+"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-600"
              placeholder="acme"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm text-slate-700">Your name</span>
          <input
            required
            value={form.name}
            onChange={set("name")}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-600"
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-700">Email</span>
          <input
            type="email"
            required
            value={form.email}
            onChange={set("email")}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-600"
            autoComplete="email"
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-700">Password</span>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={set("password")}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-600"
            autoComplete="new-password"
          />
          <span className="text-xs text-slate-500">At least 8 characters.</span>
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-brand-600 text-white py-2 font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create workspace"}
        </button>

        <p className="text-sm text-slate-600 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-700 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
