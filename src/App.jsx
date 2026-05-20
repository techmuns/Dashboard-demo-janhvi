import { startTransition, useMemo, useState } from "react";
import {
  ArrowDownUp,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  DoorClosed,
  FileSpreadsheet,
  LineChart,
  RefreshCw,
  Search,
  Sparkles,
  TrendingDown,
  Trash2,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import KPICard from "./components/KPICard";
import AnalyticsChart from "./components/AnalyticsChart";
import AnalysisCard from "./components/AnalysisCard";
import EmployeeTable from "./components/EmployeeTable";
import EmployeeDetailDrawer from "./components/EmployeeDetailDrawer";
import KmpTracker from "./components/KmpTracker";
import LoadingAnalysis from "./components/LoadingAnalysis";
import { buildLiveCompany, fetchAllLiveRecords } from "./lib/liveCompany";
import {
  countsFromLiveRecords,
  loadRecentCompanies,
  removeRecentCompany,
  upsertRecentCompany,
} from "./lib/recentCompanies";
import {
  buildDashboardSnapshot,
  createExportPayload,
  formatCompactNumber,
  formatDate,
} from "./utils/dashboard";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const kpiIcons = {
  totalEmployees: Users,
  appointments: UserPlus,
  resignations: TrendingDown,
  terminations: UserX,
  retirements: BriefcaseBusiness,
  netHeadcountChange: ArrowDownUp,
  attritionRate: LineChart,
  upcomingRetirements: DoorClosed,
};

const statusPieColors = ["#5b8def", "#3ed598", "#f5b461", "#ff7aa2", "#3ecbc7"];

// Recent-cache entries are flatter than the "remote company" shape that
// flows out of the header search; this normalises one into the other.
function entryToRemote(entry) {
  if (!entry) return null;
  return {
    ticker: entry.ticker,
    name: entry.name,
    country: entry.country,
    industry: entry.industry || "",
  };
}

function formatRelative(iso) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const tooltipStyle = {
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.6)",
  background: "rgba(255,255,255,0.85)",
  backdropFilter: "blur(12px)",
  boxShadow: "0 16px 40px -12px rgba(28, 38, 92, 0.25)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 12,
};

const recordViews = {
  appointments: {
    title: "KMP Appointments",
    subtitle: "Key Managerial Personnel appointments parsed from official announcements.",
  },
  terminations: {
    title: "KMP Terminations",
    subtitle: "Cessations of CEO, CFO, COO, CTO, CHRO, GC, Chairman and BU Head roles.",
  },
  resignations: {
    title: "KMP Resignations",
    subtitle: "Resignations of Key Managerial Personnel disclosed via filings and press releases.",
  },
  retirements: {
    title: "KMP Retirements",
    subtitle: "Retirement records for Key Managerial Personnel with announcement context.",
  },
};

export default function App() {
  const [recentCompanies, setRecentCompanies] = useState(() => loadRecentCompanies());
  // activeCompany holds the search-result entry currently driving the dashboard.
  // liveRecords holds the four agent payloads for that entry. Both null = empty state.
  const [activeCompany, setActiveCompany] = useState(() => {
    const initial = loadRecentCompanies();
    return initial[0] ? entryToRemote(initial[0]) : null;
  });
  const [liveRecords, setLiveRecords] = useState(() => {
    const initial = loadRecentCompanies();
    return initial[0]?.liveRecords || null;
  });
  const [dateRange, setDateRange] = useState("12");
  const [activeView, setActiveView] = useState("dashboard");
  const [drawerState, setDrawerState] = useState({ isOpen: false, record: null, type: "appointments" });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const liveCompany = useMemo(
    () => buildLiveCompany({ remoteCompany: activeCompany, liveRecords }),
    [activeCompany, liveRecords],
  );
  const snapshot = liveCompany ? buildDashboardSnapshot(liveCompany, dateRange) : null;
  const displayCompany = liveCompany;

  async function runRefresh(entry) {
    if (isRefreshing || !entry) return;
    setIsRefreshing(true);
    setActiveCompany(entry);
    try {
      const result = await fetchAllLiveRecords({
        ticker: entry.ticker,
        companyName: entry.name,
        country: entry.country,
      });
      setLiveRecords(result);
      setRecentCompanies((current) =>
        upsertRecentCompany(current, {
          ticker: entry.ticker,
          name: entry.name,
          country: entry.country,
          industry: entry.industry || "",
          fetchedAt: new Date().toISOString(),
          liveRecords: result,
        }),
      );
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleRefresh() {
    if (activeCompany) runRefresh(activeCompany);
  }

  function handleRemoteCompanySelect(entry) {
    setDrawerState({ isOpen: false, record: null, type: "appointments" });
    runRefresh(entry);
  }

  function handleSelectRecent(stored) {
    setDrawerState({ isOpen: false, record: null, type: "appointments" });
    setActiveCompany(entryToRemote(stored));
    setLiveRecords(stored.liveRecords || null);
    setActiveView("dashboard");
    // Bump LRU order so this becomes the most-recent again.
    setRecentCompanies((current) => upsertRecentCompany(current, stored));
  }

  function handleRemoveRecent(ticker) {
    setRecentCompanies((current) => {
      const next = removeRecentCompany(current, ticker);
      if (activeCompany?.ticker?.toUpperCase() === ticker.toUpperCase()) {
        const fallback = next[0];
        setActiveCompany(fallback ? entryToRemote(fallback) : null);
        setLiveRecords(fallback?.liveRecords || null);
      }
      return next;
    });
  }

  function handleRangeChange(nextRange) {
    startTransition(() => {
      setDateRange(nextRange);
      setDrawerState({ isOpen: false, record: null, type: "appointments" });
    });
  }

  function handleExport(reportName = "leadership-report") {
    if (!displayCompany || !snapshot) return;
    const payload = createExportPayload(displayCompany, snapshot, dateRange);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${displayCompany.name.toLowerCase().replaceAll(" ", "-")}-${reportName}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function openEmployeeDetail(record, type) {
    setDrawerState({ isOpen: true, record, type });
  }

  function handleNavigate(view) {
    setActiveView(view);
    setDrawerState({ isOpen: false, record: null, type: view in recordViews ? view : "appointments" });
  }

  function renderOverviewHero() {
    return (
      <section className="glass surface relative mb-6 overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-violet/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-brand-teal/30 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/55 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700 backdrop-blur">
              <Sparkles className="h-3 w-3 text-brand-indigo" />
              KMP Movements · Parsed from Announcements
            </span>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
                {displayCompany.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Key Managerial Personnel movements (CEO, CFO, COO, CTO, CHRO, General Counsel, Chairman,
                and material Business Unit Heads) extracted from filings and official announcements.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Sector", value: displayCompany.sector, gradient: "bg-gradient-cool" },
              { label: "Head Office", value: displayCompany.headquarters, gradient: "bg-gradient-warm" },
              {
                label: "Active KMP",
                value: formatCompactNumber(displayCompany.activeEmployees),
                gradient: "bg-gradient-mint",
              },
            ].map((item) => (
              <div key={item.label} className="glass-tile relative overflow-hidden p-4">
                <div className={`absolute inset-x-0 top-0 h-1 ${item.gradient}`} />
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {item.label}
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function renderKpis(keys) {
    const list = keys ? snapshot.kpis.filter((kpi) => keys.includes(kpi.key)) : snapshot.kpis;
    const cols = list.length <= 4 ? "xl:grid-cols-4" : "xl:grid-cols-4 2xl:grid-cols-8";
    return (
      <section className={`surface mb-6 grid gap-4 sm:grid-cols-2 ${cols}`}>
        {list.map((kpi) => {
          const Icon = kpiIcons[kpi.key];
          return (
            <KPICard
              key={kpi.key}
              icon={Icon}
              label={kpi.label}
              value={kpi.value}
              comparison={kpi.comparison}
              color={kpi.color}
            />
          );
        })}
      </section>
    );
  }

  function renderAnalyticsSection() {
    return (
      <section className="surface grid gap-6 xl:grid-cols-12">
        <AnalyticsChart
          className="xl:col-span-7"
          title="Monthly KMP Movement"
          subtitle="Appointments versus exits across the selected reporting window"
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={snapshot.monthlyMovement}>
              <defs>
                <linearGradient id="appointmentsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5b8def" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#5b8def" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="exitsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff7aa2" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ff7aa2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="#64748b" fontSize={12} />
              <YAxis tickLine={false} axisLine={false} stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value, "Count"]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="appointments"
                stroke="#5b8def"
                fill="url(#appointmentsFill)"
                strokeWidth={3}
                name="Appointments"
              />
              <Area
                type="monotone"
                dataKey="exits"
                stroke="#ff7aa2"
                fill="url(#exitsFill)"
                strokeWidth={3}
                name="Exits"
              />
            </AreaChart>
          </ResponsiveContainer>
        </AnalyticsChart>

        <AnalyticsChart
          className="xl:col-span-5"
          title="KMP Status Distribution"
          subtitle="Current senior leadership view with movement statuses"
        >
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={snapshot.statusDistribution}
                dataKey="value"
                nameKey="name"
                innerRadius={68}
                outerRadius={104}
                paddingAngle={3}
                stroke="rgba(255,255,255,0.6)"
              >
                {snapshot.statusDistribution.map((entry, index) => (
                  <Cell key={entry.name} fill={statusPieColors[index % statusPieColors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [formatCompactNumber(value), "KMP"]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </AnalyticsChart>

        <AnalyticsChart
          className="xl:col-span-7"
          title="Function-wise KMP Movement"
          subtitle="Appointments and exits by leadership function"
        >
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={snapshot.departmentMovement}>
              <defs>
                <linearGradient id="apptBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3ed598" stopOpacity={1} />
                  <stop offset="100%" stopColor="#3ecbc7" stopOpacity={0.85} />
                </linearGradient>
                <linearGradient id="exitBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff7aa2" stopOpacity={1} />
                  <stop offset="100%" stopColor="#a06cf6" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
              <XAxis dataKey="department" tickLine={false} axisLine={false} stroke="#64748b" fontSize={11} />
              <YAxis tickLine={false} axisLine={false} stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="appointments" fill="url(#apptBar)" radius={[10, 10, 0, 0]} />
              <Bar dataKey="exits" fill="url(#exitBar)" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChart>

        <div className="grid gap-6 xl:col-span-5">
          <AnalyticsChart
            title="Attrition Trend"
            subtitle="Monthly exit rate as a share of average headcount"
          >
            <ResponsiveContainer width="100%" height={200}>
              <RechartsLineChart data={snapshot.monthlyMovement}>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="#64748b" fontSize={12} />
                <YAxis tickLine={false} axisLine={false} unit="%" stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [`${value}%`, "Attrition"]}
                />
                <Line
                  type="monotone"
                  dataKey="attritionRate"
                  stroke="#7b6cf6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#7b6cf6" }}
                  activeDot={{ r: 6 }}
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </AnalyticsChart>

          <div className="glass p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">Quick Insights</h3>
                <p className="mt-1 text-sm text-slate-500">Observations for the selected company</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/55 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 backdrop-blur">
                Live
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {snapshot.insights.map((insight) => (
                <div
                  key={insight}
                  className="rounded-2xl border border-white/60 bg-white/40 px-4 py-3 text-sm leading-6 text-slate-700 backdrop-blur"
                >
                  {insight}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderAnalysisCards() {
    return (
      <section className="surface mb-6">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Company KMP Analysis
          </h2>
          <p className="text-sm text-slate-600">
            Focus areas based on senior leadership movement, attrition, succession, and retirement planning.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {snapshot.analysisCards.map((card) => (
            <AnalysisCard
              key={card.title}
              title={card.title}
              value={card.value}
              description={card.description}
              tone={card.tone}
            />
          ))}
        </div>
      </section>
    );
  }

  function renderRecentExits() {
    const sections = [
      {
        key: "resignations",
        title: "Latest KMP Resignations",
        records: snapshot.filteredRecords.resignations,
        dateField: "resignationDate",
        accent: "bg-gradient-warm",
      },
      {
        key: "terminations",
        title: "Latest KMP Terminations",
        records: snapshot.filteredRecords.terminations,
        dateField: "terminationDate",
        accent: "bg-gradient-warm",
      },
    ];

    return (
      <section className="surface mt-6 grid gap-4 xl:grid-cols-2">
        {sections.map((section) => {
          const items = [...section.records]
            .sort((a, b) => new Date(b[section.dateField]) - new Date(a[section.dateField]))
            .slice(0, 4);

          return (
            <div key={section.key} className="glass p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-8 rounded-full ${section.accent}`} />
                  <h3 className="text-lg font-semibold tracking-tight text-slate-900">{section.title}</h3>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 transition hover:text-slate-900"
                  onClick={() => handleNavigate(section.key)}
                >
                  View all <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {items.length ? (
                <ul className="mt-4 space-y-2">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-white/60 bg-white/40 px-4 py-3 backdrop-blur transition hover:bg-white/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{item.employeeName}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {item.designation} · {item.department}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-slate-700">{item.role}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatDate(item[section.dateField])}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No records in the selected window.</p>
              )}
            </div>
          );
        })}
      </section>
    );
  }

  function renderDashboardView() {
    return (
      <>
        {renderOverviewHero()}
        {renderKpis(["appointments", "resignations", "terminations", "netHeadcountChange"])}
        <section className="surface mb-6 grid gap-6 xl:grid-cols-2">
          <div className="min-w-0">{renderRecordView("appointments")}</div>
          <div className="min-w-0">{renderRecordView("resignations")}</div>
        </section>
        <section className="surface grid gap-6 xl:grid-cols-2">
          <div className="min-w-0">{renderRecordView("terminations")}</div>
          <div className="min-w-0">{renderRecordView("retirements")}</div>
        </section>
      </>
    );
  }

  function renderCompaniesView() {
    if (!recentCompanies.length) {
      return renderEmptyCompanies();
    }

    return (
      <section className="surface">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Recent Companies
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Last {recentCompanies.length} {recentCompanies.length === 1 ? "company" : "companies"} you analysed.
              Stored in this browser only. Click a card to load the cached snapshot; refresh to re-run the agents.
            </p>
          </div>
          <span className="rounded-full border border-white/60 bg-white/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600 backdrop-blur">
            {recentCompanies.length} / 5 stored locally
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recentCompanies.map((stored) => {
            const isActive =
              activeCompany?.ticker?.toUpperCase() === stored.ticker?.toUpperCase();
            const counts = countsFromLiveRecords(stored.liveRecords);
            return (
              <div
                key={stored.ticker}
                className={`glass relative overflow-hidden p-5 transition ${
                  isActive ? "ring-2 ring-brand-indigo/40" : ""
                }`}
              >
                {isActive && (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-gradient-brand px-2.5 py-1 text-[10px] font-semibold text-white shadow-glow">
                    <Sparkles className="h-3 w-3" /> Active
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleSelectRecent(stored)}
                  className="block w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3 pr-16">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold tracking-tight text-slate-900">
                        {stored.name}
                      </h3>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {stored.industry || stored.country || "—"}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-glow">
                      <Building2 className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                      {stored.ticker}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Refreshed {formatRelative(stored.fetchedAt)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {[
                      { label: "Appts", value: counts.appointments, tone: "from-emerald-500 to-teal-500" },
                      { label: "Resig", value: counts.resignations, tone: "from-amber-500 to-rose-500" },
                      { label: "Term", value: counts.terminations, tone: "from-rose-500 to-pink-500" },
                      { label: "Retire", value: counts.retirements, tone: "from-sky-500 to-indigo-500" },
                    ].map((tile) => (
                      <div
                        key={tile.label}
                        className="rounded-xl border border-white/60 bg-white/40 px-2 py-2 text-center backdrop-blur"
                      >
                        <p
                          className={`bg-gradient-to-r ${tile.tone} bg-clip-text text-lg font-semibold text-transparent`}
                        >
                          {tile.value}
                        </p>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {tile.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </button>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => runRefresh(entryToRemote(stored))}
                    disabled={isRefreshing}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/60 bg-white/55 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing && isActive ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveRecent(stored.ticker)}
                    aria-label={`Remove ${stored.name} from recents`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  function renderEmptyCompanies() {
    return (
      <section className="surface">
        <div className="glass flex flex-col items-center gap-4 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-glow">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="max-w-md">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              No companies yet
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Search a real listed company in the header above and we'll run the four KMP agents
              for you. The result lives in your browser; the last five companies show up here.
            </p>
          </div>
        </div>
      </section>
    );
  }

  function renderEmptyDashboard() {
    return (
      <section className="surface">
        <div className="glass flex flex-col items-center gap-4 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-glow">
            <Search className="h-6 w-6" />
          </div>
          <div className="max-w-md">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              Pick a company to begin
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Search a real listed company in the header above. We'll fetch its KMP appointments,
              resignations, terminations and retirements — takes about 3 minutes the first time.
            </p>
          </div>
        </div>
      </section>
    );
  }

  function recordsFor(type) {
    return snapshot.filteredRecords[type];
  }

  function renderRecordView(type) {
    const config = recordViews[type];
    return (
      <EmployeeTable
        type={type}
        records={recordsFor(type)}
        onViewDetails={openEmployeeDetail}
        title={config.title}
        subtitle={config.subtitle}
      />
    );
  }

  function renderReportsView() {
    const reports = [
      {
        title: "KMP Movement Report",
        description: "Summary of appointments, resignations, terminations for the selected period.",
        action: () => handleExport("movement-report"),
        gradient: "bg-gradient-cool",
      },
      {
        title: "Succession Watch Report",
        description: "Highlights upcoming KMP retirements and succession pressure areas.",
        action: () => handleExport("retirement-report"),
        gradient: "bg-gradient-mint",
      },
      {
        title: "Company Snapshot Report",
        description: "Compact company-level dashboard snapshot with KPI and analysis data.",
        action: () => handleExport("company-snapshot"),
        gradient: "bg-gradient-warm",
      },
    ];

    return (
      <div className="surface space-y-6">
        <section className="glass p-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Reports</h2>
          <p className="mt-1 text-sm text-slate-500">
            Generate ready-to-share reports for {displayCompany.name} and the selected window.
          </p>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            {reports.map((report) => (
              <div key={report.title} className="glass-sm relative overflow-hidden p-5">
                <div className={`absolute inset-x-0 top-0 h-1 ${report.gradient}`} />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-slate-900">{report.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{report.description}</p>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-glass-sm ${report.gradient}`}>
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                </div>
                <button
                  className="btn-gradient mt-5 w-full"
                  onClick={report.action}
                  type="button"
                >
                  Export Report
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="glass overflow-hidden">
          <div className="border-b border-white/40 px-6 py-5">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">Report Summary</h3>
            <p className="mt-1 text-sm text-slate-500">
              Latest snapshot prepared for {displayCompany.name}.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-white/40 bg-white/30 backdrop-blur">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Metric</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Value</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Updated</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.kpis.slice(0, 6).map((kpi) => (
                  <tr key={kpi.key} className="border-b border-white/30">
                    <td className="table-cell font-medium text-slate-800">{kpi.label}</td>
                    <td className="table-cell">{kpi.value}</td>
                    <td className="table-cell text-slate-500">{formatDate("2026-04-27")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  function renderContent() {
    // Tracker is fully driven by the GitHub-Action JSON snapshot,
    // so it's meaningful even without an active company.
    if (activeView === "tracker") {
      return <KmpTracker />;
    }

    // Companies tab is the only other view that's meaningful with no active company.
    if (activeView === "companies") {
      return renderCompaniesView();
    }

    if (!displayCompany || !snapshot) {
      return renderEmptyDashboard();
    }

    if (activeView === "dashboard") {
      return renderDashboardView();
    }

    if (activeView === "analytics") {
      return (
        <>
          {renderAnalyticsSection()}
          <div className="mt-6">{renderAnalysisCards()}</div>
        </>
      );
    }

    if (activeView === "reports") {
      return renderReportsView();
    }

    return <div className="surface">{renderRecordView(activeView)}</div>;
  }

  return (
    <div className="relative min-h-screen text-slate-900">
      <div className="relative flex min-h-screen">
        <Sidebar activeView={activeView} onNavigate={handleNavigate} />
        <main className="surface min-w-0 flex-1 px-4 py-4 md:px-6 lg:px-8">
          <Header
            selectedRemoteCompany={activeCompany}
            onRemoteCompanySelect={handleRemoteCompanySelect}
            dateRange={dateRange}
            onDateRangeChange={handleRangeChange}
            onRefresh={activeCompany ? handleRefresh : null}
            isRefreshing={isRefreshing}
          />

          {isRefreshing ? (
            <LoadingAnalysis
              companyName={activeCompany?.name}
              ticker={activeCompany?.ticker}
            />
          ) : (
            renderContent()
          )}
        </main>
      </div>

      <EmployeeDetailDrawer
        isOpen={drawerState.isOpen}
        record={drawerState.record}
        type={drawerState.type}
        onClose={() => setDrawerState({ isOpen: false, record: null, type: drawerState.type })}
      />
    </div>
  );
}
