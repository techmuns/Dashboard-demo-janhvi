// Data-quality rules for KMP events.
// Used by the KMP Tracker to separate verified people movements
// from parsing noise (fund/scheme rows, headline fragments, weak sources).

// Any token (case-insensitive, whole word) appearing in a person name
// is a strong signal the row is not a real person — finance product
// names, source/publication words, role descriptors, headline verbs,
// or corporate suffixes.
const INVALID_NAME_TOKENS = [
  // finance product / scheme noise
  "nav", "fund", "scheme", "plan", "growth", "idcw", "dividend",
  "option", "regular", "direct", "wdrl", "etf", "index", "bond",
  "debt", "equity", "yield", "balanced", "hybrid",
  // news / source / publication fragments
  "profit", "staff", "news", "report", "reports", "sources", "source",
  "bureau", "desk", "correspondent", "editor", "wire", "press",
  "release", "filing", "filings", "headline", "headlines", "story",
  "article", "bulletin",
  // media brands (we don't want a publication's name showing as a person)
  "ndtv", "cnbc", "reuters", "bloomberg", "mint", "moneycontrol",
  "business", "standard", "economic", "times", "livemint", "forbes",
  "today", "tribune", "express", "hindu", "outlook", "fortune",
  "linkedin", "twitter", "facebook", "dailyhunt", "cleartax",
  "scanx", "hrtoday", "psu", "stocktitan", "trade", "brains",
  "investywise", "people", "matters",
  // corporate suffixes / generic company-only text
  "ltd", "limited", "pvt", "private", "inc", "corp", "corporation",
  "company", "industries", "group", "holdings", "bank", "banks",
  "aramco", "prudential", "hdfc", "sbi", "icici", "tcs", "wipro",
  "infosys", "reliance",
  // role / action descriptors (belong in designation, not in name)
  "director", "officer", "chairman", "chair", "ceo", "cfo", "cto",
  "coo", "chro", "md", "managing", "executive", "whole-time",
  "wholetime", "general", "counsel", "appointed", "appoints",
  "appointment", "resigned", "resigns", "retired", "retires",
  "quits", "joins", "joined", "steps", "stepping", "named",
  "elevated", "gets", "becomes", "as", "to", "from",
  "interim", "acting", "former", "incoming", "outgoing",
  "auditor", "auditors", "external", "internal", "law", "firm",
  "firms", "attestation", "justifies", "part-time", "parttime",
  // common publication suffix tokens that aren't caught above
  "et", "now",
  // headline verbs / participles / phrase markers
  "alleging", "illegal", "offices", "office", "labour", "labor",
  "worker", "workers", "union", "said", "says", "told", "claims",
  "warns", "denies", "confirms", "announces", "announcement",
  "deal", "merger", "acquisition", "stake", "shareholder",
  // articles / prepositions that betray a sentence
  "the", "an", "of", "at", "for", "and", "or", "by", "with",
  "from", "over", "under", "after", "before", "into", "amid",
];

const SOURCE_BLOCKLIST = [
  "linkedin", "twitter", "facebook", "instagram", "youtube",
  "reddit", "quora", "dailyhunt", "scanx", "cleartax", "hrtoday",
  "psu connect", "stock titan", "investywise", "trade brains",
  "people matters", "hdfc sky", "indiainfoline",
];

// Trusted sources for KMP movements — Indian + global business press,
// plus exchange / investor-relations filings. Substring match,
// case-insensitive.
const TRUSTED_SOURCES = [
  "economic times", "et markets", "et now",
  "moneycontrol",
  "business standard",
  "reuters",
  "bloomberg",
  "cnbc", "cnbc tv18", "cnbc-tv18",
  "financial express",
  "livemint", "mint",
  "hindu business line", "the hindu",
  "ndtv profit",
  "business today",
  "bse", "nse", "exchange filing", "regulatory filing",
  "investor relations", "company website",
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
//  - no finance/scheme/source/role/headline tokens
//  - no all-uppercase ticker-like tokens (>2 chars)
//  - at least one vowel per non-initial token (filters acronyms)
export function isValidPersonName(rawName) {
  const name = (rawName || "").toString().trim();
  if (!name) return false;

  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 4) return false;

  // Each token must start with a letter and end with a letter or a
  // single dot (initials like "K.V."). Internal dots, apostrophes,
  // and single hyphens (e.g. "Anne-Marie") are allowed.
  const tokenPattern = /^[A-Za-z](?:[A-Za-z.''\-]*[A-Za-z]|\.)?$/;
  for (const token of tokens) {
    if (!tokenPattern.test(token)) return false;
  }

  const letters = name.replace(/[^A-Za-z]/g, "");
  if (letters.length < 4) return false;
  if (letters === letters.toUpperCase() && letters.length > 4) return false;

  // Reject names where any non-initial token is fully uppercase with
  // >=3 letters (e.g. "NDTV"), or where the LAST token is fully
  // uppercase (e.g. "Sashidhar Jagdishan MD" — suffix acronyms).
  tokens.forEach;
  for (let i = 0; i < tokens.length; i += 1) {
    const tokenLetters = tokens[i].replace(/[^A-Za-z]/g, "");
    if (tokenLetters.length >= 3 && tokenLetters === tokenLetters.toUpperCase()) {
      return false;
    }
    if (
      i === tokens.length - 1 &&
      tokenLetters.length >= 2 &&
      tokenLetters === tokenLetters.toUpperCase()
    ) {
      return false;
    }
  }

  // Whole-word match against the invalid-token blacklist.
  const lower = name.toLowerCase();
  for (const bad of INVALID_NAME_TOKENS) {
    const escaped = bad.replace(/[-]/g, "\\-");
    const pattern = new RegExp(`\\b${escaped}\\b`, "i");
    if (pattern.test(lower)) return false;
  }

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

export function isShowableInMain(event) {
  const tier = assessConfidence(event);
  return tier === "high" || tier === "medium";
}

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
