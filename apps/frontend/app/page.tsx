"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

export default function HomePage() {
  const { user, ready } = useAuth();

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="max-w-2xl text-center space-y-6">
        <p className="text-sm uppercase tracking-widest text-brand-600 font-semibold">
          Survey Platform
        </p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          A modular, developer-friendly survey platform.
        </h1>
        <p className="text-lg text-slate-600">
          Build surveys in a no-code editor, run them through a headless runtime, and
          extend everything through a REST API, SDK, and webhooks.
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          {ready && user ? (
            <Link
              href="/surveys"
              className="rounded-lg bg-brand-600 px-5 py-3 text-white font-medium hover:bg-brand-700"
            >
              Go to your surveys
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="rounded-lg bg-brand-600 px-5 py-3 text-white font-medium hover:bg-brand-700"
              >
                Create workspace
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-slate-300 px-5 py-3 font-medium hover:bg-white"
              >
                Log in
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
