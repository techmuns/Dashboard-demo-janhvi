// Data-quality rules for KMP events.
// Used by the KMP Tracker to separate verified people movements
// from parsing noise (fund/scheme rows, weak sources, low confidence).

const FINANCE_KEYWORDS = [
  "nav",
  "fund",
  "scheme",
  "plan",
  "growth",
  "idcw",
  "dividend",
  "option",
  "regular",
  "direct",
  "wdrl",
  "cap wdrl",
  "etf",
  "index",
  "bond",
  "debt",
  "equity scheme",
];

const ROLE_KEYWORDS = [
  "director",
  "officer",
  "chairman",
  "ceo",
  "cfo",
  "cto",
  "coo",
  "chro",
  "managing",
  "executive",
  "whole-time",
  "wholetime",
  "general counsel",
  "appointed",
  "gets appointed",
  "as cfo",
  "as ceo",
];

const SOURCE_BLOCKLIST = [
  "linkedin",
  "twitter",
  "facebook",
  "instagram",
  "youtube",
  "reddit",
  "quora",
  "dailyhunt",
];

// Trusted sources for KMP movements — Indian + global business press
// and high-signal aggregators. Matching is substring & case-insensitive.
const TRUSTED_SOURCES = [
  "economic times",
  "et markets",
  "et now",
  "moneycontrol",
  "business standard",
  "reuters",
  "bloomberg",
  "cnbc",
  "cnbc tv18",
  "cnbc-tv18",
  "financial express",
  "livemint",
  "mint",
  "hindu business line",
  "the hindu",
  "ndtv profit",
  "business today",
  "fortune india",
  "outlook business",
  "forbes",
  "wsj",
  "ft.com",
  "investor relations",
];

function normalise(value) {
  return (value || "").toString().trim().toLowerCase();
}

export function isTrustedSource(sourceName) {
  const s = normalise(sourceName);
  if (!s) return false;
  return TRUSTED_SOURCES.some((trusted) => s.includes(trusted));
}

export function isBlockedSource(sourceName) {
  const s = normalise(sourceName);
  if (!s) return false;
  return SOURCE_BLOCKLIST.some((blocked) => s.includes(blocked));
}

// A real person name should look like a human name:
//  - 2 to 4 whitespace-separated tokens
//  - mostly alphabetic, allows dots/apostrophes/hyphens
//  - no finance/scheme keywords
//  - no role keywords (those should be in the designation, not the name)
//  - not entirely uppercase (filters ticker-style strings)
export function isValidPersonName(rawName) {
  const name = (rawName || "").toString().trim();
  if (!name) return false;

  const lower = name.toLowerCase();

  for (const keyword of FINANCE_KEYWORDS) {
    const pattern = new RegExp(`\\b${keyword}\\b`, "i");
    if (pattern.test(lower)) return false;
  }
  for (const keyword of ROLE_KEYWORDS) {
    const pattern = new RegExp(`\\b${keyword}\\b`, "i");
    if (pattern.test(lower)) return false;
  }

  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 4) return false;

  if (!/^[A-Za-z][A-Za-z.''\-]*(?:\s+[A-Za-z.''\-]+){1,3}$/.test(name)) {
    return false;
  }

  const letters = name.replace(/[^A-Za-z]/g, "");
  if (letters.length < 4) return false;
  if (letters === letters.toUpperCase() && letters.length > 4) return false;

  return true;
}

// Returns one of: "high" | "medium" | "needs_review"
//  - high   : trusted source AND clear person AND a designation AND a known event type
//  - medium : trusted source but one of (designation/event-type) missing/unknown
//  - needs_review : weak/blocked source, invalid person, or parsing uncertainty
export function assessConfidence(event) {
  if (!isValidPersonName(event.person_name)) return "needs_review";
  if (isBlockedSource(event.source_name)) return "needs_review";

  const trusted = isTrustedSource(event.source_name);
  const hasDesignation = Boolean((event.designation || "").trim());
  const hasEventType =
    event.event_type &&
    ["appointment", "reappointment", "resignation", "termination", "retirement"].includes(
      event.event_type,
    );

  if (trusted && hasDesignation && hasEventType) return "high";
  if (trusted && (hasDesignation || hasEventType)) return "medium";
  if (event.confidence_score === "medium" && hasDesignation && hasEventType) return "medium";

  return "needs_review";
}

// Decide if an event should appear in the main dashboard.
// Main view shows only "high" and "medium" confidence rows.
export function isShowableInMain(event) {
  const tier = assessConfidence(event);
  return tier === "high" || tier === "medium";
}

// Tag every event with the computed confidence tier, so the rest of
// the UI can group/filter without re-running the rules.
export function annotateEvents(events) {
  return (events || []).map((event) => {
    const tier = assessConfidence(event);
    return {
      ...event,
      _confidence_tier: tier,
      _is_trusted_source: isTrustedSource(event.source_name),
      _has_valid_name: isValidPersonName(event.person_name),
    };
  });
}
