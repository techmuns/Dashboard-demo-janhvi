import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { searchStocks } from "../lib/birdnest";

const COUNTRY_EXCHANGE = {
  USA: "NASDAQ",
  US: "NASDAQ",
  "UNITED STATES": "NASDAQ",
  INDIA: "NSE",
  IN: "NSE",
  IND: "NSE",
};

function exchangeFor(country) {
  if (!country) return "—";
  const key = country.trim().toUpperCase();
  return COUNTRY_EXCHANGE[key] || country;
}

export default function CompanySearch({ selected, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setError(null);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const timer = setTimeout(async () => {
      try {
        const found = await searchStocks(trimmed);
        if (!cancelled) setResults(found);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function handleClick(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const inputValue = isOpen ? query : selected?.name || "";

  function handleFocus() {
    setIsOpen(true);
    if (selected?.name && !query) {
      setQuery("");
    }
  }

  function handlePick(entry) {
    onSelect(entry);
    setQuery("");
    setIsOpen(false);
  }

  return (
    <div className="relative flex-1" ref={wrapRef}>
      <div className="field-glass relative">
        <Search className="h-4 w-4 text-slate-500" />
        <input
          className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400"
          placeholder="Search a company or ticker"
          value={inputValue}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={handleFocus}
        />
        {selected?.ticker && !isOpen ? (
          <span className="ml-2 inline-flex shrink-0 items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
            {exchangeFor(selected.country)}: {selected.ticker}
          </span>
        ) : null}
      </div>

      {isOpen ? (
        <div className="glass absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-80 overflow-y-auto p-2">
          {query.trim() ? (
            <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Results for &ldquo;{query.trim()}&rdquo;
            </p>
          ) : null}

          {loading ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : error ? (
            <div className="px-3 py-4 text-sm text-rose-600">{error}</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-4 text-sm text-slate-500">
              {query.trim() ? "No matches." : "Type a company name or ticker to search."}
            </div>
          ) : (
            <div className="space-y-1">
              {results.slice(0, 25).map((entry) => (
                <button
                  key={entry.ticker}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/80"
                  onClick={() => handlePick(entry)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{entry.name}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {entry.industry || entry.country || "—"}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 whitespace-nowrap">
                    <span>{entry.ticker}</span>
                    <span className="text-indigo-400">·</span>
                    <span>{exchangeFor(entry.country)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
