import { CalendarRange, Search } from "lucide-react";
import CompanySearch from "./CompanySearch";

const rangeOptions = [
  { value: "3", label: "Last 3 months" },
  { value: "6", label: "Last 6 months" },
  { value: "12", label: "Last 12 months" },
  { value: "all", label: "All records" },
];

export default function Header({
  companies,
  companyQuery,
  onCompanyQueryChange,
  onCompanySelect,
  selectedCompany,
  dateRange,
  onDateRangeChange,
}) {
  return (
    <header className="surface mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)]">
        <label className="field-glass">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400"
            placeholder="Search a company"
            value={companyQuery}
            onChange={(event) => onCompanyQueryChange(event.target.value)}
          />
        </label>

        <CompanySearch
          companies={companies}
          query={companyQuery}
          selectedCompany={selectedCompany}
          onQueryChange={onCompanyQueryChange}
          onSelect={onCompanySelect}
        />
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
