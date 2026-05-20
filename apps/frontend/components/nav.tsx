"use client";

import Link from "next/link";
import { useAuth } from "./auth-provider";

export function Nav() {
  const { user, ready, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand-600" />
          Survey Platform
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {ready && user ? (
            <>
              <Link href="/surveys" className="hover:text-brand-700">
                Surveys
              </Link>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600">{user.email}</span>
              <button
                onClick={logout}
                className="rounded-md border border-slate-200 px-2.5 py-1 hover:bg-slate-50"
              >
                Log out
              </button>
            </>
          ) : ready ? (
            <>
              <Link href="/login" className="hover:text-brand-700">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-brand-600 text-white px-3 py-1.5 hover:bg-brand-700"
              >
                Sign up
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
