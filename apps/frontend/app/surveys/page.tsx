export default function SurveysPage() {
  return (
    <main className="flex-1 px-6 py-12 max-w-5xl mx-auto w-full">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Your surveys</h1>
          <p className="text-slate-600 mt-1">
            All surveys for your tenant. Build, publish, and analyze.
          </p>
        </div>
        <button className="rounded-lg bg-brand-600 text-white px-4 py-2 font-medium hover:bg-brand-700">
          New survey
        </button>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="p-6 text-slate-500 text-sm">
          No surveys yet — create one to get started. (Wire this list to{" "}
          <code>GET /surveys</code> next.)
        </div>
      </section>
    </main>
  );
}
