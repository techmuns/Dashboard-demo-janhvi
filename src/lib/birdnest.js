import { MUNS_TOKEN, MUNS_USER_INDEX } from "./agentConfig";

const MUNS_STOCK_SEARCH_URL = "https://devde.muns.io/stock/search";

export function mapBirdnestEntry(ticker, value) {
  const [country, name, industry] = Array.isArray(value) ? value : [];
  return {
    ticker,
    country: country || "",
    name: name || ticker,
    industry: industry || "",
  };
}

export async function searchStocks(query) {
  const trimmed = (query || "").trim();
  if (!trimmed) return [];

  const response = await fetch(MUNS_STOCK_SEARCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MUNS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_index: MUNS_USER_INDEX, query: trimmed }),
  });

  if (!response.ok) {
    throw new Error(`Stock search failed (${response.status}).`);
  }

  const json = await response.json();
  const results = json?.data?.results || {};
  const entries = Object.entries(results).map(([ticker, value]) =>
    mapBirdnestEntry(ticker, value),
  );

  const q = trimmed.toUpperCase();
  return entries.sort((a, b) => {
    const aTicker = a.ticker.toUpperCase();
    const bTicker = b.ticker.toUpperCase();
    const aExact = aTicker === q ? 0 : 1;
    const bExact = bTicker === q ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    const aPrefix = aTicker.startsWith(q) ? 0 : 1;
    const bPrefix = bTicker.startsWith(q) ? 0 : 1;
    if (aPrefix !== bPrefix) return aPrefix - bPrefix;
    return aTicker.localeCompare(bTicker);
  });
}
