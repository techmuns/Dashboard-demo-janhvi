import { useEffect, useState } from "react";
import { Activity } from "lucide-react";

// Combined runtime for the four KMP agents is ~3 minutes; bar and step
// pills are paced against this target since we await all four in
// parallel and can't read per-agent progress.
const TARGET_SECONDS = 180;

const STEPS = [
  "Connecting to MUNS agent",
  "Fetching KMP appointments",
  "Fetching KMP resignations",
  "Fetching KMP terminations",
  "Fetching KMP retirements",
  "Parsing announcement tables",
  "Building dashboard snapshot",
];

function pad(n) {
  return String(n).padStart(2, "0");
}

export default function LoadingAnalysis({ companyName, ticker }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, []);

  // Cap synthetic progress at 97% so the bar never claims "done" while
  // we're still waiting on the Promise.all to resolve.
  const ratio = Math.min(elapsed / TARGET_SECONDS, 0.97);
  const pct = Math.round(ratio * 100);
  const stepIndex = Math.min(STEPS.length - 1, Math.floor(ratio * STEPS.length));
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <section className="glass mb-6 overflow-hidden">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0f3a3a] via-[#0d3147] to-[#0a2238] px-6 py-5 text-white">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand-teal/20 blur-3xl" />
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-300/90">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
          KMP Intelligence · MUNS-Powered
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          KMP Movement Scan
        </h2>
      </div>

      <div className="px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 animate-pulse text-brand-emerald" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
                Running Analysis
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-semibold tracking-tight text-slate-900">
                  {companyName || "Selected company"}
                </h3>
                {ticker && (
                  <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-emerald-800">
                    {ticker}
                  </span>
                )}
              </div>
            </div>
          </div>
          <p className="font-mono text-sm tabular-nums text-slate-700">
            {pad(mins)}:{pad(secs)}
          </p>
        </div>

        <div className="mt-5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-mint transition-[width] duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{STEPS[stepIndex]}</span>
            <span className="font-semibold text-slate-700">{pct}%</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full ${
                i <= stepIndex ? "bg-gradient-mint" : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        <p className="mt-4 border-t border-slate-200/70 pt-4 text-xs text-slate-500">
          Leave this tab open — the dashboard will appear automatically when the
          analysis lands. Combined runtime is typically 3–4 minutes.
        </p>
      </div>
    </section>
  );
}
