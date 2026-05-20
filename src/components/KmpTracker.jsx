import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  ExternalLink,
  Filter,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Search,
  Sparkles,
} from "lucide-react";

const EVENT_TYPE_TONE = {
  appointment:   "border-emerald-200/70 bg-emerald-50/80 text-emerald-700",
  reappointment: "border-teal-200/70 bg-teal-50/80 text-teal-700",
  resignation:   "border-amber-200/70 bg-amber-50/80 text-amber-700",
  termination:   "border-rose-200/70 bg-rose-50/80 text-rose-700",
  retirement:    "border-sky-200/70 bg-sky-50/80 text-sky-700",
};

const EVENT_TYPE_ACCENT = {
  appointment:   "bg-gradient-mint",
  reappointment: "bg-gradient-cool",
  resignation:   "bg-gradient-warm",
  termination:   "bg-gradient-warm",
  retirement:    "bg-gradient-brand",
};

const CONFIDENCE_META = {
  high:   { tone: "border-emerald-200/70 bg-emerald-50/80 text-emerald-700", Icon: ShieldCheck,    label: "High" },
  medium: { tone: "border-amber-200/70 bg-amber-50/80 text-amber-700",       Icon: ShieldAlert,    label: "Medium" },
  low:    { tone: "border-slate-200/70 bg-white/70 text-slate-600",          Icon: ShieldQuestion, label: "Low" },
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

function getInitials(name) {
  if (!name) return "—";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
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
      if (!map.has(event.ticker)) map.set(event.ticker, event.company_name);
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
        return acc;
      },
      { byType: {} },
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
      <div className="glass relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-brand-violet/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-56 w-56 rounded-full bg-brand-teal/30 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/55 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700 backdrop-blur">
              <Sparkles className="h-3 w-3 text-brand-indigo" />
              KMP Change Tracker
            </span>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              Listed-company KMP movements
            </h1>
            <p className="mt-2 text-xs text-slate-500">
              Last refreshed{" "}
              <span className="font-semibold text-slate-700">
                {formatGeneratedAt(data?.generated_at)}
              </span>
              {" · "}Tracking{" "}
              <span className="font-semibold text-slate-700">
                {data?.company_count ?? 0}
              </span>{" "}
              companies
              {" · "}
              <span className="font-semibold text-slate-700">
                {data?.event_count ?? 0}
              </span>{" "}
              events captured
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/60 bg-white/60 px-3 py-2 text-sm font-semibold text-slate-700 backdrop-blur transition hover:bg-white disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Reload
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={!filteredEvents.length}
              className="btn-gradient px-4 py-2 text-sm disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="relative mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["appointment",   "Appointments",   "bg-gradient-mint"],
            ["reappointment", "Reappointments", "bg-gradient-cool"],
            ["resignation",   "Resignations",   "bg-gradient-warm"],
            ["termination",   "Terminations",   "bg-gradient-warm"],
            ["retirement",    "Retirements",    "bg-gradient-brand"],
          ].map(([key, label, accent]) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                setFilters((f) => ({ ...f, eventType: f.eventType === key ? "all" : key }))
              }
              className={`glass-sm relative overflow-hidden p-3 text-left transition hover:shadow-glass ${
                filters.eventType === key ? "ring-2 ring-brand-indigo/40" : ""
              }`}
            >
              <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
              <p className="text-2xl font-semibold text-slate-900">{counts.byType[key] || 0}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {label}
              </p>
            </button>
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
              className="w-full rounded-xl border border-white/60 bg-white/70 pl-9 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 backdrop-blur focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/40"
            />
          </div>
          <select
            value={filters.company}
            onChange={(event) => setFilters((f) => ({ ...f, company: event.target.value }))}
            className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm text-slate-700 backdrop-blur"
          >
            <option value="all">All companies</option>
            {companyOptions.map(([ticker, name]) => (
              <option key={ticker} value={ticker}>{name} ({ticker})</option>
            ))}
          </select>
          <select
            value={filters.eventType}
            onChange={(event) => setFilters((f) => ({ ...f, eventType: event.target.value }))}
            className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm text-slate-700 backdrop-blur"
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
            className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm text-slate-700 backdrop-blur"
          >
            <option value="all">All confidence</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            {filteredEvents.length} of {events.length}
          </span>
        </div>
      </div>

      {loadError ? (
        <div className="glass p-6 text-sm text-rose-600">Failed to load events: {loadError}</div>
      ) : !events.length ? (
        <div className="glass p-10 text-center">
          <p className="text-base font-semibold text-slate-700">
            No KMP events fetched yet — run GitHub Action / check source access.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Trigger Actions → <code className="rounded bg-white/60 px-1.5 py-0.5">kmp-tracker</code> → Run workflow
            (or push a change under <code>scripts/</code> or <code>data/companies.json</code>)
            to populate <code>data/kmp-events.json</code>.
          </p>
        </div>
      ) : !filteredEvents.length ? (
        <div className="glass p-10 text-center text-sm text-slate-500">
          No events match the current filters.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredEvents.map((event) => {
            const eventTone = EVENT_TYPE_TONE[event.event_type] || "border-slate-200/70 bg-white/70 text-slate-700";
            const accent = EVENT_TYPE_ACCENT[event.event_type] || "bg-gradient-brand";
            const conf = CONFIDENCE_META[event.confidence_score] || CONFIDENCE_META.low;
            const ConfIcon = conf.Icon;
            return (
              <a
                key={event.id}
                href={event.source_url}
                target="_blank"
                rel="noreferrer noopener"
                className="glass group relative block overflow-hidden p-5 transition hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-glow focus:outline-none focus:ring-2 focus:ring-brand-indigo/40"
              >
                <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-sm font-bold text-white shadow-glow">
                      {getInitials(event.person_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-900">
                        {event.person_name || "—"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {event.designation || "Role unspecified"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold capitalize backdrop-blur ${eventTone}`}
                  >
                    {event.event_type}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/60 bg-white/40 px-3 py-2 backdrop-blur">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Effective</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-800">{formatDate(event.effective_date)}</p>
                  </div>
                  <div className="rounded-xl border border-white/60 bg-white/40 px-3 py-2 backdrop-blur">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Announced</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-800">{formatDate(event.announcement_date)}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{event.company_name}</p>
                    <p className="truncate text-xs text-slate-500">
                      <span className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                        {event.ticker}
                      </span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      {event.source_name}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize backdrop-blur ${conf.tone}`}
                  >
                    <ConfIcon className="h-3 w-3" />
                    {conf.label}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/40 pt-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {event.source_type}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-indigo opacity-0 transition group-hover:opacity-100">
                    View source
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>

                <ExternalLink className="absolute right-4 top-4 h-3.5 w-3.5 text-slate-300 transition group-hover:text-brand-indigo" />
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}
