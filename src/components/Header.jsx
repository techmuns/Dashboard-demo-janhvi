import { CalendarRange, RefreshCw } from "lucide-react";
import CompanySearch from "./CompanySearch";

const rangeOptions = [
  { value: "3", label: "Last 3 months" },
  { value: "6", label: "Last 6 months" },
  { value: "12", label: "Last 12 months" },
  { value: "all", label: "All records" },
];

export default function Header({
  selectedRemoteCompany,
  onRemoteCompanySelect,
  dateRange,
  onDateRangeChange,
  onRefresh,
  isRefreshing = false,
}) {
  return (
    <header className="surface relative z-30 mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <CompanySearch selected={selectedRemoteCompany} onSelect={onRemoteCompanySelect} />
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh data"
            title={isRefreshing ? "Refreshing…" : "Refresh data"}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-white/60 text-slate-600 shadow-glass-sm transition hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        ) : null}
      </div>

      <div className="flex items-center justify-end">
        <label className="field-glass !py-2 text-sm text-slate-700">
          <CalendarRange className="h-4 w-4 text-slate-500" />
          <select
            className="bg-transparent font-medium text-slate-700"
            value={dateRange}
            onChange={(event) => onDateRangeChange(event.target.value)}
          >
            {rangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}
