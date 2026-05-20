import Link from "next/link";

export default function HomePage() {
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
          <Link
            href="/builder"
            className="rounded-lg bg-brand-600 px-5 py-3 text-white font-medium hover:bg-brand-700"
          >
            Open builder
          </Link>
          <Link
            href="/surveys"
            className="rounded-lg border border-slate-300 px-5 py-3 font-medium hover:bg-white"
          >
            View surveys
          </Link>
        </div>
      </div>
    </main>
  );
}
