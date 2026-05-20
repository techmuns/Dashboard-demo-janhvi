import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  X,
} from "lucide-react";
import { annotateEvents } from "../utils/kmpQuality";

const EVENT_TYPES = [
  {
    key: "appointment",
    label: "Appointments",
    short: "Appointment",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-400",
    accent: "from-emerald-200/70 to-emerald-50/40",
    ring: "ring-emerald-300",
  },
  {
    key: "reappointment",
    label: "Reappointments",
    short: "Reappointment",
    pill: "border-sky-200 bg-sky-50 text-sky-700",
    dot: "bg-sky-400",
    accent: "from-sky-200/70 to-sky-50/40",
    ring: "ring-sky-300",
  },
  {
    key: "resignation",
    label: "Resignations",
    short: "Resignation",
    pill: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-400",
    accent: "from-amber-200/70 to-amber-50/40",
    ring: "ring-amber-300",
  },
  {
    key: "termination",
    label: "Terminations",
    short: "Termination",
    pill: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-400",
    accent: "from-rose-200/70 to-rose-50/40",
    ring: "ring-rose-300",
  },
  {
    key: "retirement",
    label: "Retirements",
    short: "Retirement",
    pill: "border-violet-200 bg-violet-50 text-violet-700",
    dot: "bg-violet-400",
    accent: "from-violet-200/70 to-violet-50/40",
    ring: "ring-violet-300",
  },
];

const EVENT_TYPE_MAP = Object.fromEntries(EVENT_TYPES.map((t) => [t.key, t]));

const CONFIDENCE_META = {
  high: {
    label: "High",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Icon: ShieldCheck,
  },
  medium: {
    label: "Medium",
    pill: "border-amber-200 bg-amber-50 text-amber-700",
    Icon: ShieldAlert,
  },
  needs_review: {
    label: "Needs review",
    pill: "border-slate-200 bg-slate-50 text-slate-600",
    Icon: ShieldQuestion,
  },
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
  const [activeKpi, setActiveKpi] = useState("all");
  // Confidence filter defaults to "verified" (high + medium) — Needs Review
  // records are hidden from the main table until a user explicitly picks them.
  const [filters, setFilters] = useState({
    query: "",
    company: "all",
    confidence: "verified",
    range: "all",
  });
  const [activeEvent, setActiveEvent] = useState(null);

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

  const annotated = useMemo(() => annotateEvents(data?.events || []), [data]);

  // Pool the filter UI operates on. Needs-review is excluded by default;
  // selecting it in the Confidence dropdown brings it back in.
  const eligibleEvents = useMemo(() => {
    if (filters.confidence === "needs_review") {
      return annotated.filter((e) => e._confidence_tier === "needs_review");
    }
    return annotated.filter((e) => e._confidence_tier !== "needs_review");
  }, [annotated, filters.confidence]);

  const verifiedTotal = useMemo(
    () => annotated.filter((e) => e._confidence_tier !== "needs_review").length,
    [annotated],
  );
  const auditTotal = useMemo(
    () => annotated.filter((e) => e._confidence_tier === "needs_review").length,
    [annotated],
  );

  const companyOptions = useMemo(() => {
    const map = new Map();
    eligibleEvents.forEach((event) => {
      if (!map.has(event.ticker)) map.set(event.ticker, event.company_name);
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [eligibleEvents]);

  // KPI cards always reflect the verified pool, even when the user is
  // peeking at the audit bucket via the confidence dropdown.
  const countsByType = useMemo(() => {
    const acc = {};
    annotated.forEach((event) => {
      if (event._confidence_tier === "needs_review") return;
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
    });
    return acc;
  }, [annotated]);

  const rangeBound = useMemo(() => {
    if (filters.range === "all") return null;
    const days = Number(filters.range);
    if (!Number.isFinite(days)) return null;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return cutoff;
  }, [filters.range]);

  const filteredEvents = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return eligibleEvents.filter((event) => {
      if (activeKpi !== "all" && event.event_type !== activeKpi) return false;
      if (filters.company !== "all" && event.ticker !== filters.company) return false;
      if (
        filters.confidence !== "all" &&
        filters.confidence !== "verified" &&
        filters.confidence !== "needs_review" &&
        event._confidence_tier !== filters.confidence
      ) {
        return false;
      }
      if (rangeBound) {
        const dateStr = event.announcement_date || event.effective_date;
        if (dateStr) {
          const eventDate = new Date(dateStr);
          if (!Number.isNaN(eventDate.getTime()) && eventDate < rangeBound) {
            return false;
          }
        }
      }
      if (!q) return true;
      const haystack = [
        event.person_name,
        event.designation,
        event.company_name,
        event.ticker,
        event.source_name,
        event.reason_for_change,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [eligibleEvents, filters, activeKpi, rangeBound]);

  function toggleKpi(key) {
    setActiveKpi((current) => (current === key ? "all" : key));
  }

  function resetFilters() {
    setActiveKpi("all");
    setFilters({ query: "", company: "all", confidence: "verified", range: "all" });
  }

  function downloadCsv() {
    if (!filteredEvents.length) return;
    const headers = [
      "company_name", "ticker", "person_name", "designation", "event_type",
      "effective_date", "announcement_date", "reason_for_change",
      "source_name", "source_url", "confidence_tier",
    ];
    const escape = (v) => {
      const str = (v ?? "").toString().replaceAll('"', '""');
      return /[",\n]/.test(str) ? `"${str}"` : str;
    };
    const lines = [headers.join(",")];
    filteredEvents.forEach((event) => {
      const row = { ...event, confidence_tier: event._confidence_tier };
      lines.push(headers.map((h) => escape(row[h])).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `kmp-events-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const filtersActive =
    activeKpi !== "all" ||
    filters.query ||
    filters.company !== "all" ||
    filters.confidence !== "verified" ||
    filters.range !== "all";

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                M
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Munshot
                </p>
                <p className="text-xs font-semibold text-slate-700">KMP Intelligence</p>
              </div>
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
              Listed-company KMP movements
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
              Tracking verified senior-management changes across listed companies.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <p className="text-xs text-slate-400">
              Last refreshed{" "}
              <span className="font-medium text-slate-600">
                {formatGeneratedAt(data?.generated_at)}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filters.range}
                onChange={(event) =>
                  setFilters((f) => ({ ...f, range: event.target.value }))
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Date range"
              >
                <option value="all">All dates</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="180">Last 6 months</option>
                <option value="365">Last 12 months</option>
              </select>
              <button
                type="button"
                onClick={load}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Reload
              </button>
              <button
                type="button"
                onClick={downloadCsv}
                disabled={!filteredEvents.length}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* KPI filter cards */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            label="All events"
            count={verifiedTotal}
            active={activeKpi === "all"}
            tone="neutral"
            onClick={() => setActiveKpi("all")}
          />
          {EVENT_TYPES.map((type) => (
            <KpiCard
              key={type.key}
              label={type.label}
              count={countsByType[type.key] || 0}
              active={activeKpi === type.key}
              tone={type.key}
              onClick={() => toggleKpi(type.key)}
            />
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={filters.query}
              onChange={(event) =>
                setFilters((f) => ({ ...f, query: event.target.value }))
              }
              placeholder="Search person, company, designation or source"
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <select
            value={filters.company}
            onChange={(event) =>
              setFilters((f) => ({ ...f, company: event.target.value }))
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">All companies</option>
            {companyOptions.map(([ticker, name]) => (
              <option key={ticker} value={ticker}>
                {name} ({ticker})
              </option>
            ))}
          </select>
          <select
            value={activeKpi}
            onChange={(event) => setActiveKpi(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">All event types</option>
            {EVENT_TYPES.map((type) => (
              <option key={type.key} value={type.key}>
                {type.short}
              </option>
            ))}
          </select>
          <select
            value={filters.confidence}
            onChange={(event) =>
              setFilters((f) => ({ ...f, confidence: event.target.value }))
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="verified">Verified (High + Medium)</option>
            <option value="high">High only</option>
            <option value="medium">Medium only</option>
            <option value="needs_review">Needs review ({auditTotal})</option>
          </select>

          <div className="ml-auto flex items-center gap-3 pr-1">
            <span className="text-xs font-medium text-slate-500">
              {filteredEvents.length} of {verifiedTotal} verified events
            </span>
            {filtersActive && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
        {filters.confidence === "needs_review" && (
          <p className="mt-2 text-[11px] text-amber-700">
            Showing parsing-audit bucket — these records failed name validation
            or come from weak sources, and are hidden from the main table by default.
          </p>
        )}
      </div>

      {/* Body */}
      {loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          Failed to load events: {loadError}
        </div>
      ) : !data ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-soft">
          Loading events…
        </div>
      ) : !filteredEvents.length ? (
        <EmptyState
          title="No verified KMP events found for this filter."
          body="Try clearing filters or widening the date range."
        />
      ) : (
        <EventTable events={filteredEvents} onSelect={setActiveEvent} />
      )}

      {activeEvent && (
        <EventDrawer event={activeEvent} onClose={() => setActiveEvent(null)} />
      )}
    </section>
  );
}

function KpiCard({ label, count, active, tone, onClick }) {
  const meta = EVENT_TYPE_MAP[tone];
  const isNeutral = tone === "neutral";

  const ringColor = isNeutral ? "ring-slate-300" : meta.ring;
  const dotColor = isNeutral ? "bg-slate-400" : meta.dot;
  const gradient = isNeutral
    ? "from-slate-100 to-white"
    : meta.accent;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border bg-white p-4 text-left transition hover:border-slate-300 hover:shadow-md ${
        active
          ? `border-transparent ring-2 ${ringColor} shadow-md`
          : "border-slate-200"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gradient} opacity-60`}
      />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </span>
        </div>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {count}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {active ? "Filter active" : "Tap to filter"}
        </p>
      </div>
    </button>
  );
}

function EventTable({ events, onSelect }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <div className="max-h-[640px] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
            <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <th className="px-4 py-3">Person</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Designation</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Announced</th>
              <th className="px-4 py-3">Effective</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const type = EVENT_TYPE_MAP[event.event_type];
              const conf = CONFIDENCE_META[event._confidence_tier] || CONFIDENCE_META.needs_review;
              const ConfIcon = conf.Icon;
              return (
                <tr
                  key={event.id}
                  onClick={() => onSelect(event)}
                  className="group cursor-pointer border-b border-slate-100 transition hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                    {event.person_name || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-800">{event.company_name}</span>
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        {event.ticker}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {event.designation || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {type ? (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${type.pill}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${type.dot}`} />
                        {type.short}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatDate(event.announcement_date)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatDate(event.effective_date)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex max-w-[170px] items-center gap-1 truncate rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {event.source_name || "Unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${conf.pill}`}
                    >
                      <ConfIcon className="h-3 w-3" />
                      {conf.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center text-slate-300 transition group-hover:text-slate-600">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-12 text-center shadow-soft">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{body}</p>
    </div>
  );
}

function EventDrawer({ event, onClose }) {
  const type = EVENT_TYPE_MAP[event.event_type];
  const conf = CONFIDENCE_META[event._confidence_tier] || CONFIDENCE_META.needs_review;
  const ConfIcon = conf.Icon;

  const reasons = [];
  if (event._has_valid_name && event._is_trusted_source) {
    reasons.push("Trusted source and a real person name.");
  } else if (!event._has_valid_name) {
    reasons.push("Person name failed validation (likely headline / scheme / role text).");
  } else if (!event._is_trusted_source) {
    reasons.push("Source is not on the trusted-publishers list.");
  }
  if (!event.designation) reasons.push("Designation missing.");
  if (!event.event_type) reasons.push("Event type unknown.");

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="flex-1 bg-slate-900/30 backdrop-blur-sm"
      />
      <aside className="relative flex w-full max-w-md flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              KMP event
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
              {event.person_name || "—"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {event.designation || "Role unspecified"} · {event.company_name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            {type && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${type.pill}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${type.dot}`} />
                {type.short}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {event.ticker}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${conf.pill}`}
            >
              <ConfIcon className="h-3 w-3" />
              {conf.label}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Announced">{formatDate(event.announcement_date)}</Field>
            <Field label="Effective">{formatDate(event.effective_date)}</Field>
            <Field label="Source">{event.source_name || "Unknown"}</Field>
            <Field label="Source type">{event.source_type || "—"}</Field>
          </dl>

          {event.reason_for_change && (
            <Field label="Reason for change" full>
              {event.reason_for_change}
            </Field>
          )}

          {event.brief_profile && (
            <Field label="Profile" full>
              {event.brief_profile}
            </Field>
          )}

          <Field label="Confidence reason" full>
            <ul className="space-y-1 text-sm text-slate-600">
              {reasons.length ? (
                reasons.map((reason) => <li key={reason}>· {reason}</li>)
              ) : (
                <li>· Matches all validation rules.</li>
              )}
            </ul>
          </Field>

          {event.source_url && (
            <a
              href={event.source_url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Open source
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children, full = false }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-slate-700">{children}</dd>
    </div>
  );
}
