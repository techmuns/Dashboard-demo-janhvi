import { useState } from "react";
import { ExternalLink, Loader2, Sparkles } from "lucide-react";
import { runKmpAppointmentsAgent } from "../lib/munsAgent";
import { parseMunsTable } from "../lib/munsParse";
import { munsRowsToAppointments } from "../lib/munsToAppointments";
import { DEFAULT_AGENT_METADATA } from "../lib/agentConfig";

const kindChip = {
  appointment: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  resignation: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  termination: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
  retirement: "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
  other: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  unknown: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
};

const looksLikeUrl = (value) => /^https?:\/\//i.test(value);

export default function LiveKmpAppointments({ defaultCompanyName }) {
  const [ticker, setTicker] = useState(DEFAULT_AGENT_METADATA.stock_ticker);
  const [companyName, setCompanyName] = useState(
    defaultCompanyName || DEFAULT_AGENT_METADATA.stock_company_name,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [fetchedAt, setFetchedAt] = useState(null);

  const fetchLive = async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await runKmpAppointmentsAgent({
        ticker: ticker.trim(),
        companyName: companyName.trim(),
      });
      const parsed = parseMunsTable(raw);
      if (!parsed) {
        throw new Error("Could not find a markdown table in the agent response.");
      }
      const mapped = munsRowsToAppointments(parsed);
      setRows(mapped);
      setFetchedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass mb-6 overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-white/60 px-6 py-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 ring-1 ring-white">
            <Sparkles className="h-3 w-3 text-brand-indigo" />
            Live via MUNS
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
            Live KMP appointments
          </h2>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            Pull verified Key Managerial Personnel changes for any listed company straight
            from official announcements via the MUNS agent.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="field-glass !w-full sm:!w-32">
            <input
              className="w-full bg-transparent text-sm font-medium uppercase tracking-wide text-slate-800 placeholder:text-slate-400"
              value={ticker}
              onChange={(event) => setTicker(event.target.value)}
              placeholder="JIOFIN"
              aria-label="Ticker"
            />
          </label>
          <label className="field-glass !w-full sm:!w-72">
            <input
              className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Jio Financial Services Ltd."
              aria-label="Company name"
            />
          </label>
          <button
            onClick={fetchLive}
            disabled={loading || !ticker.trim()}
            type="button"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {loading ? "Fetching…" : "Pull live"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="border-b border-white/60 bg-rose-50/70 px-6 py-3 text-xs font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-white/40">
              <tr>
                {[
                  "Serial No",
                  "Person & Role",
                  "Change Type",
                  "Effective Date & Why It Matters",
                  "Source Name",
                  "Source Date",
                ].map((label) => (
                  <th
                    key={label}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  className="border-t border-white/60 transition hover:bg-white/55"
                >
                  <td className="table-cell align-top">
                    <span className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-full bg-white/70 px-2 text-xs font-semibold text-slate-700 ring-1 ring-white">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </td>
                  <td className="table-cell align-top">
                    <p className="font-semibold text-slate-900">{row.person}</p>
                    {row.role ? (
                      <p className="mt-0.5 text-xs text-slate-500">{row.role}</p>
                    ) : null}
                  </td>
                  <td className="table-cell align-top">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${kindChip[row.kind]}`}
                    >
                      {row.changeType || "—"}
                    </span>
                  </td>
                  <td className="table-cell align-top">
                    <div className="max-w-md">
                      <p className="text-sm font-semibold text-slate-900">
                        {row.effectiveDate || "—"}
                      </p>
                      {row.whyItMatters ? (
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {row.whyItMatters}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="table-cell align-top">
                    {looksLikeUrl(row.sourceName) ? (
                      <a
                        href={row.sourceName}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900"
                      >
                        Open source
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </a>
                    ) : (
                      <span className="text-xs font-medium text-slate-700">
                        {row.sourceName || "—"}
                      </span>
                    )}
                  </td>
                  <td className="table-cell align-top text-slate-700">
                    {row.sourceDate || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !loading && !error ? (
        <div className="px-6 py-12 text-center">
          <h3 className="text-base font-semibold text-slate-800">No live data yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Set ticker and company name, then click <span className="font-semibold">Pull live</span> to fetch via MUNS.
          </p>
        </div>
      ) : null}

      {fetchedAt && rows.length > 0 ? (
        <div className="border-t border-white/60 px-6 py-3 text-xs text-slate-500">
          {rows.length} {rows.length === 1 ? "row" : "rows"} pulled at {fetchedAt.toLocaleTimeString()}
        </div>
      ) : null}
    </div>
  );
}
