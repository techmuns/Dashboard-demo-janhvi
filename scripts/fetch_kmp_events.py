#!/usr/bin/env python3
"""KMP Change Tracker — bot-friendly fetcher.

Pulls KMP-movement events for each tracked company from:
  1) Tijori Finance company announcement pages   (aggregator → high if PDF link)
  2) Trendlyne company announcement pages        (aggregator → high if PDF link)
  3) Google News RSS targeted at company + KMP keywords
     (returns Moneycontrol / ET Markets / Business Standard / Reuters etc.
     as the validation layer; medium when an "official-hint" token is present)
  4) Bing News RSS as a redundant search source
  5) Optional SerpAPI for company-domain PDF discovery when SERPAPI_KEY is set

Whenever a result links to a PDF, the PDF is downloaded and parsed so we can
populate effective_date, term_of_appointment, reason_for_change and a brief
profile snippet — that's what promotes the row to "high" confidence.

Direct NSE / BSE scraping is intentionally avoided.

Output: data/kmp-events.json (and public/data/kmp-events.json) — one row per
person/event after deduplication.
"""

from __future__ import annotations

import hashlib
import html
import io
import json
import os
import re
import sys
import time
from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from urllib.parse import quote_plus, urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from dateutil import parser as dateparser
from xml.etree import ElementTree as ET

try:
    from pypdf import PdfReader
except Exception:  # noqa: BLE001
    PdfReader = None  # type: ignore[assignment]


ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
PUBLIC_DATA_DIR = ROOT / "public" / "data"
COMPANIES_FILE = DATA_DIR / "companies.json"
OUTPUT_FILE = DATA_DIR / "kmp-events.json"
PUBLIC_OUTPUT_FILE = PUBLIC_DATA_DIR / "kmp-events.json"

HTTP_TIMEOUT = 25
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)
SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": USER_AGENT,
    "Accept-Language": "en-IN,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
})

SERPAPI_KEY = os.environ.get("SERPAPI_KEY", "").strip()
MAX_PDF_BYTES = 8 * 1024 * 1024  # 8 MB safety cap


# ---------------------------------------------------------------------------
# Keyword vocabulary
# ---------------------------------------------------------------------------

EVENT_KEYWORDS = [
    "KMP", "Key Managerial Personnel", "Senior Management Personnel", "SMP",
    "CEO", "CFO", "MD", "Managing Director", "Whole-time Director", "WTD",
    "Company Secretary", "Compliance Officer",
    "resignation", "appointment", "reappointment", "cessation",
    "termination", "removal", "retirement", "superannuation",
    "Regulation 30", "LODR", "change in management",
    "change in senior management",
]

# Event-type classification (order matters — first match wins).
EVENT_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("reappointment", re.compile(
        r"\b(re[- ]?appoint(?:ed|ment|s)?|extension of (?:tenure|term)|"
        r"renewal of (?:tenure|term))\b", re.I)),
    ("retirement", re.compile(
        r"\b(retir(?:e|ed|ement|es|ing)|superannuat(?:e|ed|ion)|"
        r"completion of (?:tenure|term|second term)|end of (?:tenure|term))\b", re.I)),
    ("termination", re.compile(
        r"\b(terminat(?:ed|ion)|removed?\s+from|removal\s+of|dismiss(?:ed|al)|"
        r"discontinu(?:ed|ation))\b", re.I)),
    ("resignation", re.compile(
        r"\b(resign(?:ed|ation|s)?|tendered (?:his|her|the)? ?resignation|"
        r"stepp?ed[- ]?down|cease[ds]? to be|cessation|demit(?:ted|s)? office)\b",
        re.I)),
    ("appointment", re.compile(
        r"\b(appoint(?:ed|ment|s)?|joins as|assumes? charge|takes? charge|"
        r"designated as (?:kmp|smp|key|senior)|inducted\s+as|"
        r"elevat(?:ed|ion) to)\b", re.I)),
]

DESIGNATION_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("Managing Director & CEO", re.compile(
        r"managing director\s*(?:and|&|,)\s*(?:ceo|chief executive officer)|"
        r"\bmd\s*(?:and|&|,)\s*ceo\b", re.I)),
    ("Executive Chairman",      re.compile(r"\bexecutive chair(?:man|person)?\b", re.I)),
    ("CEO",                     re.compile(r"\bchief executive officer\b|\bceo\b", re.I)),
    ("CFO",                     re.compile(r"\bchief financial officer\b|\bcfo\b", re.I)),
    ("COO",                     re.compile(r"\bchief operating officer\b|\bcoo\b", re.I)),
    ("CTO",                     re.compile(r"\bchief technology officer\b|\bcto\b", re.I)),
    ("CHRO",                    re.compile(r"\bchief human resources officer\b|\bchro\b", re.I)),
    ("CIO",                     re.compile(r"\bchief information officer\b|\bcio\b", re.I)),
    ("CRO",                     re.compile(r"\bchief risk officer\b|\bcro\b", re.I)),
    ("Managing Director",       re.compile(r"\bmanaging director\b|\bmd\b", re.I)),
    ("Whole-time Director",     re.compile(r"\bwhole[- ]?time director\b|\bwtd\b", re.I)),
    ("Executive Director",      re.compile(r"\bexecutive director\b", re.I)),
    ("Independent Director",    re.compile(r"\bindependent director\b", re.I)),
    ("Non-Executive Director",  re.compile(r"\bnon[- ]?executive director\b", re.I)),
    ("Chairman",                re.compile(r"\bchairperson\b|\bchairman\b|\bchairwoman\b", re.I)),
    ("Company Secretary",       re.compile(r"\bcompany secretary\b|\bcomp(?:any)? secy\b", re.I)),
    ("Compliance Officer",      re.compile(r"\bcompliance officer\b", re.I)),
    ("General Counsel",         re.compile(r"\bgeneral counsel\b", re.I)),
    ("Director",                re.compile(r"\bdirector\b", re.I)),
]

NEWS_DOMAINS = {
    "moneycontrol.com":             ("Moneycontrol",        "news"),
    "economictimes.indiatimes.com": ("ET Markets",          "news"),
    "m.economictimes.com":          ("ET Markets",          "news"),
    "business-standard.com":        ("Business Standard",   "news"),
    "reuters.com":                  ("Reuters",             "news"),
    "in.reuters.com":               ("Reuters",             "news"),
    "livemint.com":                 ("Mint",                "news"),
    "thehindubusinessline.com":     ("Hindu BusinessLine",  "news"),
    "cnbctv18.com":                 ("CNBC-TV18",           "news"),
    "bloombergquint.com":           ("BQ Prime",            "news"),
    "bqprime.com":                  ("BQ Prime",            "news"),
    "ndtvprofit.com":               ("NDTV Profit",         "news"),
    "financialexpress.com":         ("Financial Express",   "news"),
    "tijorifinance.com":            ("Tijori Finance",      "aggregator"),
    "trendlyne.com":                ("Trendlyne",           "aggregator"),
}

OFFICIAL_HINT_TOKENS = (
    "regulation 30", "lodr", "stock exchange", "intimation",
    "intimation to", "bse intimation", "nse intimation", "annexure",
    "bse limited", "national stock exchange", "sebi (listing", "outcome of board",
)


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class Event:
    company_name: str
    ticker: str
    person_name: str
    designation: str
    event_type: str
    effective_date: str
    announcement_date: str
    reason_for_change: str
    brief_profile: str
    term_of_appointment: str
    resignation_letter_attached: str  # yes / no / unknown
    source_name: str
    source_url: str
    source_type: str                  # ir | aggregator | news | search
    confidence_score: str             # high | medium | low
    matched_keywords: list[str] = field(default_factory=list)
    extra_sources: list[str] = field(default_factory=list)

    @property
    def id(self) -> str:
        key = f"{self.ticker}|{self.person_name.lower()}|{self.event_type}|{self.effective_date or self.announcement_date}"
        return hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def _http_get(url: str, *, accept: str | None = None) -> requests.Response | None:
    try:
        headers = {"Accept": accept} if accept else None
        resp = SESSION.get(url, timeout=HTTP_TIMEOUT, allow_redirects=True, headers=headers)
    except requests.RequestException as exc:
        print(f"  ! fetch failed {url}: {exc}", file=sys.stderr)
        return None
    if resp.status_code != 200:
        print(f"  ! HTTP {resp.status_code} for {url}", file=sys.stderr)
        return None
    return resp


def fetch_html(url: str) -> str:
    resp = _http_get(url)
    if resp is None:
        return ""
    if "pdf" in (resp.headers.get("content-type") or "").lower():
        return ""
    return resp.text


def fetch_pdf_text(url: str) -> str:
    if PdfReader is None:
        return ""
    resp = _http_get(url, accept="application/pdf")
    if resp is None:
        return ""
    ctype = (resp.headers.get("content-type") or "").lower()
    body = resp.content[:MAX_PDF_BYTES]
    looks_like_pdf = body[:4] == b"%PDF" or "pdf" in ctype or url.lower().endswith(".pdf")
    if not looks_like_pdf:
        return ""
    try:
        reader = PdfReader(io.BytesIO(body))
        text = "\n".join((page.extract_text() or "") for page in reader.pages[:20])
    except Exception as exc:  # noqa: BLE001
        print(f"  ! pdf parse failed {url}: {exc}", file=sys.stderr)
        return ""
    return re.sub(r"\s+", " ", text).strip()


def _rss_field(item: ET.Element, name: str) -> str:
    """Get text from an RSS <item> child by local-name, ignoring namespaces."""
    for child in item:
        local = child.tag.rsplit("}", 1)[-1]
        if local == name and child.text:
            return child.text
    return ""


def fetch_feed(url: str) -> list[dict]:
    """Parse RSS 2.0 / Atom into a list of dicts using stdlib only."""
    resp = _http_get(url, accept="application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8")
    if resp is None:
        return []
    try:
        root = ET.fromstring(resp.content)
    except ET.ParseError as exc:
        print(f"  ! RSS parse failed {url}: {exc}", file=sys.stderr)
        return []

    entries: list[dict] = []
    # RSS 2.0
    for item in root.iter():
        tag = item.tag.rsplit("}", 1)[-1].lower()
        if tag not in ("item", "entry"):
            continue
        title = _rss_field(item, "title")
        link = _rss_field(item, "link")
        if not link:
            # Atom often has <link href="...">
            for child in item:
                if child.tag.rsplit("}", 1)[-1].lower() == "link" and child.attrib.get("href"):
                    link = child.attrib["href"]
                    break
        summary = _rss_field(item, "description") or _rss_field(item, "summary") or _rss_field(item, "content")
        published = (
            _rss_field(item, "pubDate")
            or _rss_field(item, "published")
            or _rss_field(item, "updated")
            or _rss_field(item, "date")
        )
        # Google News RSS ships <source url="https://www.moneycontrol.com">Moneycontrol</source>
        source_name = ""
        source_url = ""
        for child in item:
            if child.tag.rsplit("}", 1)[-1].lower() == "source":
                source_name = (child.text or "").strip()
                source_url = child.attrib.get("url", "")
                break
        if not title or not link:
            continue
        entries.append({
            "title": title,
            "link": link,
            "summary": summary,
            "published": published,
            "publisher_name": source_name,
            "publisher_url": source_url,
        })
    return entries


# ---------------------------------------------------------------------------
# Classification helpers
# ---------------------------------------------------------------------------

def classify_event(text: str) -> str | None:
    for label, pattern in EVENT_PATTERNS:
        if pattern.search(text):
            return label
    return None


def classify_designation(text: str) -> str:
    for label, pattern in DESIGNATION_PATTERNS:
        if pattern.search(text):
            return label
    return ""


_HONORIFIC = r"(?:Mr\.?|Ms\.?|Mrs\.?|Dr\.?|Shri\.?|Smt\.?|Prof\.?)\s+"
# Case-sensitive even when the surrounding pattern uses re.I — name tokens
# must start with an uppercase letter so we don't grab "with effect from".
_NAME_CORE = r"(?-i:[A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){1,3})"

_NOUN_FORM = (
    r"(?:resignation|appointment|re[- ]?appointment|cessation|termination|"
    r"retirement|removal|superannuation)"
)
_ACTION_VERB = (
    r"(?:appoint(?:ed|ment|s)?|joins?|joined|takes?\s+charge|assumes?\s+charge|"
    r"re[- ]?appoint(?:ed|ment|s)?|resign(?:ed|ation|s)?|tendered|"
    r"stepp?ed[- ]?down|cease[ds]?|ceased?\s+to\s+be|retir(?:ed|es|ing|ement)?|"
    r"terminat(?:ed|ion)?|removed?|elevat(?:ed|es|ion)?|designat(?:ed|ion)?|"
    r"inducted|demit(?:ted|s)?|will\s+retire|will\s+cease|will\s+step)"
)

_NAME_PATTERNS = [
    # A) "<noun-form> of [honorific] NAME"
    re.compile(rf"{_NOUN_FORM}\s+of\s+(?:{_HONORIFIC})?({_NAME_CORE})", re.I),
    # B) "[honorific] NAME as [the] [new] <role>"
    re.compile(
        rf"(?:{_HONORIFIC})?({_NAME_CORE})\s+as\s+"
        rf"(?:the\s+)?(?:new\s+)?(?:Chief|CEO|CFO|COO|CTO|CHRO|Managing|Whole|Executive|"
        rf"Independent|Non[- ]?Executive|Chairman|Chairperson|Director|Company Secretary|"
        rf"Compliance Officer|General Counsel|MD|WTD|President)",
        re.I,
    ),
    # C) "<action> [honorific] NAME"  (e.g. "appointed Mr. X")
    re.compile(rf"{_ACTION_VERB}\s+(?:{_HONORIFIC})?({_NAME_CORE})", re.I),
    # D) "[honorific] NAME [, optional designation clause]? (has|will|is)? <action>"
    re.compile(
        rf"(?:{_HONORIFIC})?({_NAME_CORE})"
        rf"(?:\s*,\s*[^.,;]{{1,80}})?"     # optional ", Chief Financial Officer"
        rf"\s*,?\s*"
        rf"(?:has\s+|have\s+|will\s+|is\s+|was\s+|would\s+)?(?:been\s+)?"
        rf"{_ACTION_VERB}",
        re.I,
    ),
]

# Words that should never start (or appear in) a person name.
_NOISE_WORDS = {
    "The", "Bse", "Nse", "Sebi", "Lodr", "Limited", "Company", "Ltd",
    "Industries", "Bank", "India", "Indian", "Group", "Services", "Securities",
    "Board", "Regulation", "Annexure", "Stock", "Exchange", "Outcome", "Notice",
    "Mumbai", "Delhi", "Bengaluru", "Chennai", "Pursuant", "Subject", "Reference",
    "Listing", "Disclosure", "Pursuance", "Notification", "National",
    "Tata", "Reliance", "Infosys", "Wipro", "Hdfc", "Icici", "Axis", "Sbi",
    "Jio", "Larsen", "Inc", "Inc.", "Plc", "Corp", "Corporation", "Fund",
    "Capital", "Holdings", "Reinvestment", "Mutual", "Trust", "Foundation",
    "Government", "Ministry",
}

_FORBIDDEN_TOKEN_SUBSTRINGS = (
    "ltd", "ltd.", "limited", "industries", "regulation", " inc", "inc.",
    " plc", "corp", "fund", "holdings", "capital",
)

# Tokens commonly seen as designation fragments — never start a person name.
_DESIGNATION_TOKENS = {
    "Chief", "Executive", "Managing", "Independent", "Whole-time", "Wholetime",
    "Director", "Officer", "Secretary", "Counsel", "Chairman", "Chairperson",
    "Chairwoman", "President", "Vice", "Head", "Compliance", "Financial",
    "Operating", "Technology", "Human", "Information", "Risk", "General",
    "Senior", "Joint", "Deputy", "Additional", "Non-Executive", "Non",
}


def _candidate_is_clean(candidate: str) -> bool:
    tokens = candidate.split()
    if len(tokens) < 2:
        return False
    if tokens[0] in _NOISE_WORDS or tokens[0] in _DESIGNATION_TOKENS:
        return False
    lowered = candidate.lower()
    if any(bad in lowered for bad in _FORBIDDEN_TOKEN_SUBSTRINGS):
        return False
    if classify_designation(candidate) and len(tokens) <= 3:
        # The whole candidate is a designation, not a person.
        if all(tok in _DESIGNATION_TOKENS or tok.lower() in {"and", "&", "of", "the"} for tok in tokens):
            return False
    for tok in tokens:
        if len(tok) < 2:
            return False
        if tok in _NOISE_WORDS:
            return False
    return True


def extract_person(text: str) -> str:
    text_clean = re.sub(r"\s+", " ", text)
    # Strip possessive prefixes like "Flipkart's" / "Infosys'".
    text_clean = re.sub(r"\b[A-Z][\w-]*['’]s\s+", "", text_clean)
    for pattern in _NAME_PATTERNS:
        for match in pattern.finditer(text_clean):
            candidate = re.sub(rf"^{_HONORIFIC}", "", match.group(1).strip())
            candidate = candidate.rstrip(",.;:'")
            if _candidate_is_clean(candidate):
                return candidate
    return ""


def extract_keywords(text: str) -> list[str]:
    lowered = text.lower()
    return [kw for kw in EVENT_KEYWORDS if kw.lower() in lowered]


def parse_date(value: str | None) -> str:
    if not value:
        return ""
    try:
        dt = dateparser.parse(value, fuzzy=True, dayfirst=True)
    except (ValueError, TypeError, OverflowError):
        return ""
    if dt is None:
        return ""
    return dt.date().isoformat()


# Effective-date phrases inside disclosure PDFs.
_EFFECTIVE_PATTERNS = [
    re.compile(r"with effect from\s+([0-9]{1,2}[\s./-][A-Za-z0-9]{2,9}[\s./-][0-9]{2,4})", re.I),
    re.compile(r"w\.?e\.?f\.?\s+([0-9]{1,2}[\s./-][A-Za-z0-9]{2,9}[\s./-][0-9]{2,4})", re.I),
    re.compile(r"effective\s+(?:date|from)?\s*[:\-]?\s*([0-9]{1,2}[\s./-][A-Za-z0-9]{2,9}[\s./-][0-9]{2,4})", re.I),
    re.compile(r"(?:closing hours of|close of business hours on)\s+([0-9]{1,2}[\s./-][A-Za-z0-9]{2,9}[\s./-][0-9]{2,4})", re.I),
]

_TERM_PATTERNS = [
    re.compile(r"(?:for a (?:period|term) of\s+)([^.,;]{3,80})", re.I),
    re.compile(r"(?:term of\s+(?:appointment|office)\s*[:\-]?\s*)([^.,;]{3,80})", re.I),
    re.compile(r"(?:tenure\s*[:\-]?\s*)([^.,;]{3,80})", re.I),
]

_REASON_PATTERNS = [
    re.compile(r"(?:reason(?:s)?\s+for\s+(?:resignation|cessation|change)\s*[:\-]\s*)([^.]{5,250})", re.I),
    re.compile(r"(?:due to\s+)([^.]{5,200})", re.I),
    re.compile(r"(?:on account of\s+)([^.]{5,200})", re.I),
    re.compile(r"(?:to pursue\s+)([^.]{5,200})", re.I),
]


def extract_effective_date(text: str) -> str:
    for pattern in _EFFECTIVE_PATTERNS:
        match = pattern.search(text)
        if match:
            parsed = parse_date(match.group(1))
            if parsed:
                return parsed
    return ""


def extract_term(text: str) -> str:
    for pattern in _TERM_PATTERNS:
        match = pattern.search(text)
        if match:
            value = re.sub(r"\s+", " ", match.group(1)).strip(" ,.;:")
            if 3 < len(value) < 120:
                return value
    return ""


def extract_reason(text: str) -> str:
    for pattern in _REASON_PATTERNS:
        match = pattern.search(text)
        if match:
            value = re.sub(r"\s+", " ", match.group(1)).strip(" ,.;:")
            if 5 < len(value) < 220:
                return value
    return ""


def extract_profile(text: str) -> str:
    # First "brief profile" / "brief particulars" paragraph if present.
    pat = re.compile(
        r"(?:brief profile|brief particulars|professional summary|profile of)"
        r"[\s:\-]+([^.]{30,400}(?:\.[^.]{0,200}){0,2})",
        re.I,
    )
    match = pat.search(text)
    if match:
        return re.sub(r"\s+", " ", match.group(1)).strip()
    return ""


def detect_letter_attached(text: str) -> str:
    lowered = text.lower()
    if "annexure" in lowered and "resignation letter" in lowered:
        return "yes"
    if "copy of the resignation" in lowered or "resignation letter is enclosed" in lowered:
        return "yes"
    if "resignation letter is not" in lowered or "letter is not enclosed" in lowered:
        return "no"
    return "unknown"


def normalize_source(url: str) -> tuple[str, str]:
    host = urlparse(url).netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    for domain, (name, stype) in NEWS_DOMAINS.items():
        if domain in host:
            return name, stype
    return host or "Unknown", "search"


_GOOGLE_NEWS_HOSTS = ("news.google.com",)


def resolve_news_redirect(url: str) -> str:
    """Google News RSS returns proxied URLs like
    https://news.google.com/rss/articles/<base64>?oc=5 which redirect to the
    real publisher. Follow with a HEAD (then GET fallback) to get the final
    landing URL so we can recognise Moneycontrol / ET / Reuters / etc."""
    host = urlparse(url).netloc.lower()
    if not any(h in host for h in _GOOGLE_NEWS_HOSTS):
        return url
    try:
        resp = SESSION.head(url, timeout=HTTP_TIMEOUT, allow_redirects=True)
        if resp.url and "news.google.com" not in urlparse(resp.url).netloc.lower():
            return resp.url
    except requests.RequestException:
        pass
    try:
        resp = SESSION.get(url, timeout=HTTP_TIMEOUT, allow_redirects=True, stream=True)
        final = resp.url
        # Google News sometimes returns an interstitial HTML page; scrape <a> or meta-refresh.
        if final and "news.google.com" in urlparse(final).netloc.lower():
            try:
                snippet = resp.text[:6000]
            except Exception:  # noqa: BLE001
                snippet = ""
            match = re.search(r'data-n-au="([^"]+)"', snippet)
            if match:
                final = html.unescape(match.group(1))
            else:
                match = re.search(r'<meta[^>]+http-equiv="refresh"[^>]+url=([^">]+)"', snippet, re.I)
                if match:
                    final = html.unescape(match.group(1))
        resp.close()
        return final or url
    except requests.RequestException:
        return url


def score_confidence(source_type: str, body_hint: str, has_pdf_body: bool) -> str:
    body_lower = (body_hint or "").lower()
    has_official_hint = any(tok in body_lower for tok in OFFICIAL_HINT_TOKENS)
    if source_type == "ir":
        return "high"
    if source_type == "aggregator" and has_pdf_body:
        return "high"
    if source_type == "aggregator" and has_official_hint:
        return "high"
    if source_type == "aggregator":
        return "medium"
    if has_pdf_body:
        return "high"
    if source_type == "news" and has_official_hint:
        return "medium"
    if source_type == "news":
        return "medium"
    return "low"


# ---------------------------------------------------------------------------
# Multi-event splitting
# ---------------------------------------------------------------------------

def split_blob_segments(text: str) -> list[str]:
    """Break a disclosure blob into sentence-level segments so one PDF
    announcing two movements (e.g. resignation + appointment) becomes two rows.

    We split only on sentence boundaries (./!/?). Splitting on "and" or commas
    too aggressively tore designation clauses away from the person name."""
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    # Don't break on "Mr." / "Ms." / "Dr." / numbered list items.
    protected = re.sub(r"\b(Mr|Ms|Mrs|Dr|Prof|Smt|Shri|No)\.\s", r"\1__DOT__ ", text)
    sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z])", protected)
    out: list[str] = []
    for raw in sentences:
        sentence = raw.replace("__DOT__", ".").strip()
        if len(sentence) >= 20 and classify_event(sentence):
            out.append(sentence)
    return out or ([text] if classify_event(text) else [])


# ---------------------------------------------------------------------------
# Source fetchers
# ---------------------------------------------------------------------------

def google_news_rss_urls(company_name: str) -> list[str]:
    base = "https://news.google.com/rss/search?hl=en-IN&gl=IN&ceid=IN:en&q="
    queries = [
        f'"{company_name}" (appointment OR appointed OR "joins as")',
        f'"{company_name}" (resignation OR resigned OR "stepped down" OR cessation)',
        f'"{company_name}" (CEO OR CFO OR "Managing Director" OR "Company Secretary")',
        f'"{company_name}" ("Regulation 30" OR LODR OR "Key Managerial Personnel")',
        f'"{company_name}" (termination OR removed OR retirement OR superannuation)',
    ]
    return [base + quote_plus(q) + "&num=25" for q in queries]


def bing_news_rss_urls(company_name: str) -> list[str]:
    base = "https://www.bing.com/news/search?format=rss&q="
    queries = [
        f'"{company_name}" (appointment OR resignation OR "Managing Director" OR CFO OR CEO)',
        f'"{company_name}" ("Regulation 30" OR "Key Managerial Personnel" OR LODR)',
    ]
    return [base + quote_plus(q) for q in queries]


def events_from_blob(
    *,
    company: dict,
    title: str,
    summary: str,
    link: str,
    published: str,
    source_name: str,
    source_type: str,
    pdf_text: str = "",
) -> list[Event]:
    """Turn one source item into 0..N Event rows."""
    body = " ".join(filter(None, [title, summary, pdf_text]))
    if not body.strip():
        return []
    keywords = extract_keywords(body)
    if not keywords and not classify_event(body):
        return []

    blob_for_split = pdf_text or f"{title}. {summary}"
    segments = split_blob_segments(blob_for_split) or [body]

    out: list[Event] = []
    seen_keys: set[str] = set()
    has_pdf_body = bool(pdf_text)
    has_pdf_link = link.lower().endswith(".pdf") or ".pdf?" in link.lower()
    letter = detect_letter_attached(pdf_text) if pdf_text else (
        "yes" if has_pdf_link else "unknown"
    )

    for segment in segments:
        etype = classify_event(segment) or classify_event(body)
        if not etype:
            continue
        person = extract_person(segment) or extract_person(body)
        if not person:
            continue
        designation = classify_designation(segment) or classify_designation(body)
        eff_date = extract_effective_date(pdf_text or segment) if pdf_text else extract_effective_date(segment)
        term = extract_term(pdf_text) if pdf_text else ""
        reason = extract_reason(pdf_text) if pdf_text else extract_reason(segment)
        profile = extract_profile(pdf_text) if pdf_text else ""

        dedupe_key = f"{person.lower()}|{etype}|{designation.lower()}"
        if dedupe_key in seen_keys:
            continue
        seen_keys.add(dedupe_key)

        confidence = score_confidence(source_type, body, has_pdf_body or has_pdf_link)

        out.append(Event(
            company_name=company["name"],
            ticker=company["ticker"],
            person_name=person,
            designation=designation,
            event_type=etype,
            effective_date=eff_date,
            announcement_date=parse_date(published),
            reason_for_change=reason,
            brief_profile=profile,
            term_of_appointment=term,
            resignation_letter_attached=letter,
            source_name=source_name,
            source_url=link,
            source_type=source_type,
            confidence_score=confidence,
            matched_keywords=keywords,
        ))
    return out


def fetch_news_events(company: dict) -> list[Event]:
    events: list[Event] = []
    seen_links: set[str] = set()
    feeds: list[str] = []
    feeds.extend(google_news_rss_urls(company["name"]))
    feeds.extend(bing_news_rss_urls(company["name"]))

    for url in feeds:
        for entry in fetch_feed(url):
            title = html.unescape((entry.get("title") or "")).strip()
            summary = html.unescape(re.sub(r"<[^>]+>", " ", entry.get("summary") or "")).strip()
            link = (entry.get("link") or "").strip()
            if not title or not link or link in seen_links:
                continue
            seen_links.add(link)

            # Prefer publisher metadata from the RSS <source> element if
            # present (Google News ships it); otherwise resolve the redirect.
            publisher_url = (entry.get("publisher_url") or "").strip()
            publisher_name = (entry.get("publisher_name") or "").strip()
            if publisher_url:
                source_name, source_type = normalize_source(publisher_url)
                if source_type == "search" and publisher_name:
                    source_name = publisher_name
                    source_type = "news"
            else:
                resolved = resolve_news_redirect(link) or link
                source_name, source_type = normalize_source(resolved)
                if resolved != link:
                    link = resolved

            pdf_text = ""
            link_lower = link.lower()
            if link_lower.endswith(".pdf") or ".pdf?" in link_lower:
                pdf_text = fetch_pdf_text(link)

            published = entry.get("published") or ""
            events.extend(events_from_blob(
                company=company,
                title=title,
                summary=summary,
                link=link,
                published=published,
                source_name=source_name,
                source_type=source_type,
                pdf_text=pdf_text,
            ))
    return events


def _scrape_aggregator(
    *,
    company: dict,
    url: str,
    source_name: str,
    source_type: str,
    base_url: str,
) -> list[Event]:
    html_text = fetch_html(url)
    if not html_text:
        return []
    soup = BeautifulSoup(html_text, "lxml")
    events: list[Event] = []
    seen_links: set[str] = set()

    for row in soup.select("a[href], li, tr, div.announcement, div.news-row, div.event-item"):
        text = " ".join(row.get_text(" ", strip=True).split())
        if len(text) < 25 or not classify_event(text):
            continue
        link_node = row if row.name == "a" and row.has_attr("href") else row.find("a", href=True)
        link = link_node["href"] if link_node else url
        link = urljoin(base_url, link)
        if link in seen_links:
            continue
        seen_links.add(link)

        pdf_text = ""
        if link.lower().endswith(".pdf") or ".pdf?" in link.lower():
            pdf_text = fetch_pdf_text(link)

        # Title is the visible row text; published date often appears within it.
        events.extend(events_from_blob(
            company=company,
            title=text[:240],
            summary=text,
            link=link,
            published=text,
            source_name=source_name,
            source_type=source_type,
            pdf_text=pdf_text,
        ))
    return events


def fetch_tijori_events(company: dict) -> list[Event]:
    slug = (company.get("tijori_slug") or "").strip()
    if not slug:
        return []
    urls = [
        f"https://www.tijorifinance.com/company/{slug}/announcements/",
        f"https://www.tijorifinance.com/company/{slug}/events/",
        f"https://www.tijorifinance.com/company/{slug}/",
    ]
    out: list[Event] = []
    for url in urls:
        out.extend(_scrape_aggregator(
            company=company,
            url=url,
            source_name="Tijori Finance",
            source_type="aggregator",
            base_url="https://www.tijorifinance.com",
        ))
    return out


def fetch_trendlyne_events(company: dict) -> list[Event]:
    slug = (company.get("trendlyne_slug") or company.get("ticker") or "").strip()
    if not slug:
        return []
    urls = [
        f"https://trendlyne.com/equity/Announcements/{slug}/",
        f"https://trendlyne.com/equity/news/{slug}/",
        f"https://trendlyne.com/equity/corp-actions/{slug}/",
    ]
    out: list[Event] = []
    for url in urls:
        out.extend(_scrape_aggregator(
            company=company,
            url=url,
            source_name="Trendlyne",
            source_type="aggregator",
            base_url="https://trendlyne.com",
        ))
    return out


def fetch_serpapi_pdfs(company: dict) -> list[Event]:
    if not SERPAPI_KEY:
        return []
    query = (
        f'"{company["name"]}" (appointment OR resignation OR "Regulation 30") '
        'filetype:pdf'
    )
    url = (
        "https://serpapi.com/search.json?engine=google&"
        f"q={quote_plus(query)}&api_key={SERPAPI_KEY}&num=20"
    )
    try:
        resp = SESSION.get(url, timeout=HTTP_TIMEOUT)
        data = resp.json()
    except (requests.RequestException, json.JSONDecodeError) as exc:
        print(f"  ! SerpAPI failed: {exc}", file=sys.stderr)
        return []

    events: list[Event] = []
    for item in data.get("organic_results", [])[:20]:
        link = item.get("link", "")
        snippet = item.get("snippet", "") or ""
        title = item.get("title", "") or ""
        host = urlparse(link).netloc.lower()
        first_word = re.split(r"\s+", company["name"])[0].lower()
        is_company_host = first_word in host or company["ticker"].lower() in host
        source_type = "ir" if (is_company_host and link.lower().endswith(".pdf")) else "search"
        source_name = host or "Search"
        pdf_text = fetch_pdf_text(link) if link.lower().endswith(".pdf") else ""

        events.extend(events_from_blob(
            company=company,
            title=title,
            summary=snippet,
            link=link,
            published="",
            source_name=source_name,
            source_type=source_type,
            pdf_text=pdf_text,
        ))
    return events


# ---------------------------------------------------------------------------
# Dedup + merge
# ---------------------------------------------------------------------------

def dedupe_and_rank(events: Iterable[Event]) -> list[Event]:
    order = {"high": 3, "medium": 2, "low": 1}
    by_key: dict[str, Event] = {}
    for ev in events:
        if not ev.person_name:
            continue
        key_date = ev.effective_date or ev.announcement_date or ""
        key = f"{ev.ticker}|{ev.person_name.lower().strip()}|{ev.event_type}|{key_date[:7]}"
        existing = by_key.get(key)
        if not existing:
            by_key[key] = ev
            continue
        winner, loser = (
            (ev, existing) if order.get(ev.confidence_score, 0) > order.get(existing.confidence_score, 0)
            else (existing, ev)
        )
        winner.matched_keywords = sorted(set(winner.matched_keywords + loser.matched_keywords))
        winner.extra_sources = sorted(set(winner.extra_sources + loser.extra_sources + [loser.source_url]))
        # Fill blanks on winner from loser if possible.
        for field_name in ("effective_date", "term_of_appointment", "reason_for_change",
                           "brief_profile", "designation"):
            if not getattr(winner, field_name) and getattr(loser, field_name):
                setattr(winner, field_name, getattr(loser, field_name))
        by_key[key] = winner
    # Stable sort: high confidence first, then most recent announcement.
    result = list(by_key.values())
    result.sort(key=lambda e: (
        -order.get(e.confidence_score, 0),
        e.effective_date or e.announcement_date or "",
    ), reverse=False)
    result.sort(key=lambda e: e.announcement_date or "", reverse=True)
    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def load_companies() -> list[dict]:
    if not COMPANIES_FILE.exists():
        raise SystemExit(f"missing {COMPANIES_FILE}")
    return json.loads(COMPANIES_FILE.read_text())["companies"]


def main() -> int:
    companies = load_companies()
    all_events: list[Event] = []
    diag = {
        "by_company": {},
        "by_source": {},
        "by_confidence": {"high": 0, "medium": 0, "low": 0},
    }
    started_at = datetime.now(timezone.utc).isoformat()

    for company in companies:
        ticker = company["ticker"]
        print(f"--- {ticker} : {company['name']} ---")
        gathered: list[Event] = []
        per_source: dict[str, int] = {}

        for label, fn in (
            ("serpapi", fetch_serpapi_pdfs),
            ("tijori", fetch_tijori_events),
            ("trendlyne", fetch_trendlyne_events),
            ("news",   fetch_news_events),
        ):
            try:
                rows = fn(company)
                print(f"  {label}: {len(rows)} raw hits")
                per_source[label] = len(rows)
                gathered.extend(rows)
            except Exception as exc:  # noqa: BLE001
                print(f"  ! {label} block failed: {exc}", file=sys.stderr)
                per_source[label] = 0

        ranked = dedupe_and_rank(gathered)
        diag["by_company"][ticker] = len(ranked)
        diag["by_source"][ticker] = per_source
        for ev in ranked:
            diag["by_confidence"][ev.confidence_score] = (
                diag["by_confidence"].get(ev.confidence_score, 0) + 1
            )
        print(f"  -> {len(ranked)} unique events (from {len(gathered)} raw hits)")
        all_events.extend(ranked)

        time.sleep(1.5)

    payload = {
        "generated_at": started_at,
        "company_count": len(companies),
        "event_count": len(all_events),
        "companies_tracked": [c["ticker"] for c in companies],
        "diagnostics": diag,
        "events": [{"id": ev.id, **asdict(ev)} for ev in all_events],
    }

    for target in (OUTPUT_FILE, PUBLIC_OUTPUT_FILE):
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
        print(f"wrote {target} ({len(all_events)} events)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
