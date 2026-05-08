import { Building2, ChevronDown, Search } from "lucide-react";
import { useDeferredValue, useState } from "react";

export default function CompanySearch({
  companies,
  query,
  selectedCompany,
  onQueryChange,
  onSelect,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(deferredQuery.trim().toLowerCase()),
  );

  return (
    <div
      className="relative"
      onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
    >
      <button
        className="field-glass w-full justify-between text-left transition hover:bg-white/85"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand text-white">
            <Building2 className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Company</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">{selectedCompany.name}</p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-500 transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="glass absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 p-3">
          <label className="field-glass">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              autoFocus
              className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400"
              placeholder="Search company"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onFocus={() => setIsOpen(true)}
            />
          </label>

          <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {filteredCompanies.length ? (
              filteredCompanies.map((company) => {
                const isSelected = company.id === selectedCompany.id;
                return (
                  <button
                    key={company.id}
                    className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                      isSelected
                        ? "bg-gradient-brand text-white"
                        : "text-slate-700 hover:bg-white/70"
                    }`}
                    onClick={() => {
                      onSelect(company.id);
                      setIsOpen(false);
                    }}
                    type="button"
                  >
                    <p className="text-sm font-semibold">{company.name}</p>
                    <p className={`mt-0.5 text-xs ${isSelected ? "text-white/80" : "text-slate-500"}`}>
                      {company.sector} • {company.headquarters}
                    </p>
                  </button>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                No companies matched.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
