import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Filter,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Search,
} from "lucide-react";

const EVENT_TYPE_TONE = {
  appointment:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  reappointment: "bg-teal-50 text-teal-700 border-teal-200",
  resignation:   "bg-amber-50 text-amber-700 border-amber-200",
  termination:   "bg-rose-50 text-rose-700 border-rose-200",
  retirement:    "bg-sky-50 text-sky-700 border-sky-200",
};

const CONFIDENCE_META = {
  high:   { tone: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: ShieldCheck,    label: "High" },
  medium: { tone: "bg-amber-50 text-amber-700 border-amber-200",       Icon: ShieldAlert,    label: "Medium" },
  low:    { tone: "bg-slate-50 text-slate-600 border-slate-200",       Icon: ShieldQuestion, label: "Low" },
};

function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatGeneratedAt(iso) {
  if (!iso) return "never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function KmpTracker() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    query: "",
    company: "all",
    eventType: "all",
    confidence: "all",
  });

  async function load() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`/data/kmp-events.json?ts=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      setData(payload);
    } catch (error) {
      setLoadError(error.message || "Failed to load KMP events");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const events = data?.events || [];

  const companyOptions = useMemo(() => {
    const map = new Map();
    events.forEach((event) => {
      if (!map.has(event.ticker)) {
        map.set(event.ticker, event.company_name);
      }
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [events]);

  const filteredEvents = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return events.filter((event) => {
      if (filters.company !== "all" && event.ticker !== filters.company) return false;
      if (filters.eventType !== "all" && event.event_type !== filters.eventType) return false;
      if (filters.confidence !== "all" && event.confidence_score !== filters.confidence) return false;
      if (!q) return true;
      const haystack = [
        event.person_name, event.designation, event.company_name, event.ticker,
        event.source_name, event.reason_for_change,
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [events, filters]);

  const counts = useMemo(() => {
    return events.reduce(
      (acc, event) => {
        acc.byType[event.event_type] = (acc.byType[event.event_type] || 0) + 1;
        acc.byConfidence[event.confidence_score] = (acc.byConfidence[event.confidence_score] || 0) + 1;
        return acc;
      },
      { byType: {}, byConfidence: {} },
    );
  }, [events]);

  function downloadCsv() {
    if (!filteredEvents.length) return;
    const headers = [
      "company_name", "ticker", "person_name", "designation", "event_type",
      "effective_date", "announcement_date", "reason_for_change",
      "brief_profile", "term_of_appointment", "resignation_letter_attached",
      "source_name", "source_url", "source_type", "confidence_score",
    ];
    const escape = (v) => {
      const str = (v ?? "").toString().replaceAll('"', '""');
      return /[",\n]/.test(str) ? `"${str}"` : str;
    };
    const lines = [headers.join(",")];
    filteredEvents.forEach((event) => {
      lines.push(headers.map((h) => escape(event[h])).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `kmp-events-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="surface space-y-5">
      <div className="glass p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/55 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700 backdrop-blur">
              KMP Change Tracker
            </span>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              Listed-company KMP movements
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Pulled from Tijori Finance, Trendlyne, Moneycontrol, ET Markets, Business Standard,
              Reuters and targeted Google/Bing news searches. NSE/BSE are intentionally not scraped.
              Updated on schedule by the <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">kmp-tracker</code> GitHub Action.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Last refreshed: <span className="font-semibold text-slate-700">{formatGeneratedAt(data?.generated_at)}</span>
              {" · "}Tracking <span className="font-semibold text-slate-700">{data?.company_count ?? 0}</span> companies
              {" · "}<span className="font-semibold text-slate-700">{data?.event_count ?? 0}</span> events captured
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/60 bg-white/55 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Reload
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={!filteredEvents.length}
              className="btn-gradient inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["appointment",   "Appointments"],
            ["reappointment", "Reappointments"],
            ["resignation",   "Resignations"],
            ["termination",   "Terminations"],
            ["retirement",    "Retirements"],
          ].map(([key, label]) => (
            <div key={key} className="rounded-2xl border border-white/60 bg-white/40 px-3 py-3 text-center backdrop-blur">
              <p className="text-xl font-semibold text-slate-900">{counts.byType[key] || 0}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={filters.query}
              onChange={(event) => setFilters((f) => ({ ...f, query: event.target.value }))}
              placeholder="Search person, designation, source…"
              className="w-full rounded-xl border border-white/60 bg-white/70 pl-9 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/40"
            />
          </div>
          <select
            value={filters.company}
            onChange={(event) => setFilters((f) => ({ ...f, company: event.target.value }))}
            className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">All companies</option>
            {companyOptions.map(([ticker, name]) => (
              <option key={ticker} value={ticker}>{name} ({ticker})</option>
            ))}
          </select>
          <select
            value={filters.eventType}
            onChange={(event) => setFilters((f) => ({ ...f, eventType: event.target.value }))}
            className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">All event types</option>
            <option value="appointment">Appointment</option>
            <option value="reappointment">Reappointment</option>
            <option value="resignation">Resignation</option>
            <option value="termination">Termination</option>
            <option value="retirement">Retirement</option>
          </select>
          <select
            value={filters.confidence}
            onChange={(event) => setFilters((f) => ({ ...f, confidence: event.target.value }))}
            className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">All confidence</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            {filteredEvents.length} of {events.length} events
          </span>
        </div>
      </div>

      <div className="glass overflow-hidden">
        {loadError ? (
          <div className="p-6 text-sm text-rose-600">Failed to load events: {loadError}</div>
        ) : !events.length ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No events yet. Run the <code className="rounded bg-slate-100 px-1.5 py-0.5">kmp-tracker</code> GitHub Action
            (Actions → kmp-tracker → Run workflow) to populate <code>data/kmp-events.json</code>.
          </div>
        ) : !filteredEvents.length ? (
          <div className="p-8 text-center text-sm text-slate-500">No events match the current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-white/40 bg-white/30 backdrop-blur">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <th className="px-4 py-3">Person</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Event Type</th>
                  <th className="px-4 py-3">Effective Date</th>
                  <th className="px-4 py-3">Announcement Date</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3 text-right">View</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => {
                  const eventTone = EVENT_TYPE_TONE[event.event_type] || "bg-slate-50 text-slate-700 border-slate-200";
                  const conf = CONFIDENCE_META[event.confidence_score] || CONFIDENCE_META.low;
                  const ConfIcon = conf.Icon;
                  return (
                    <tr key={event.id} className="border-b border-white/30 align-top transition hover:bg-white/40">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{event.person_name || "—"}</p>
                        {event.brief_profile ? (
                          <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">{event.brief_profile}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{event.designation || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${eventTone}`}>
                          {event.event_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(event.effective_date)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(event.announcement_date)}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{event.company_name}</p>
                        <p className="text-xs text-slate-500">{event.ticker}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{event.source_name}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{event.source_type}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${conf.tone}`}>
                          <ConfIcon className="h-3 w-3" />
                          {conf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={event.source_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/60 bg-white/55 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white"
                        >
                          View Source
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
