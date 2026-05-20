#!/usr/bin/env python3
"""KMP Change Tracker — bot-friendly fetcher.

Pulls KMP-movement events for each tracked company from:
  1) Tijori Finance company announcement pages
  2) Trendlyne company announcement pages
  3) Google News RSS targeted at company + KMP keywords
     (returns Moneycontrol / ET Markets / Business Standard / Reuters etc.
     as the validation layer)
  4) Bing News RSS as a redundant search source
  5) Optional SerpAPI for company-domain PDF discovery when SERPAPI_KEY is set

Direct NSE / BSE scraping is intentionally avoided — those endpoints commonly
block bots and the workflow needs to be reliable.

Output: data/kmp-events.json with one row per person/event.
"""

from __future__ import annotations

import hashlib
import html
import json
import os
import re
import sys
import time
from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from urllib.parse import quote_plus, urlparse

import feedparser
import requests
from bs4 import BeautifulSoup
from dateutil import parser as dateparser


ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
PUBLIC_DATA_DIR = ROOT / "public" / "data"
COMPANIES_FILE = DATA_DIR / "companies.json"
OUTPUT_FILE = DATA_DIR / "kmp-events.json"
PUBLIC_OUTPUT_FILE = PUBLIC_DATA_DIR / "kmp-events.json"

HTTP_TIMEOUT = 20
USER_AGENT = (
    "Mozilla/5.0 (compatible; KMPTrackerBot/1.0; "
    "+https://github.com/techmuns/dashboard-demo-janhvi)"
)
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": USER_AGENT, "Accept-Language": "en-IN,en;q=0.9"})

SERPAPI_KEY = os.environ.get("SERPAPI_KEY", "").strip()


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
        r"\b(re[- ]?appoint(?:ed|ment)?|extension of (?:tenure|term)|"
        r"renewal of (?:tenure|term))\b", re.I)),
    ("appointment", re.compile(
        r"\b(appoint(?:ed|ment|s)?|joins as|assumes? charge|takes? charge|"
        r"designated as (?:kmp|smp|key|senior))\b", re.I)),
    ("resignation", re.compile(
        r"\b(resign(?:ed|ation|s)?|tendered (?:his|her|the)? ?resignation|"
        r"stepp?ed[- ]?down|cease[ds]? to be|cessation|demit(?:ted|s)? office)\b",
        re.I)),
    ("termination", re.compile(
        r"\b(terminat(?:ed|ion)|removed?|removal|dismiss(?:ed|al)|"
        r"discontinu(?:ed|ation))\b", re.I)),
    ("retirement", re.compile(
        r"\b(retir(?:ed|ement|es)|superannuat(?:ed|ion)|"
        r"completion of (?:tenure|term)|end of (?:tenure|term))\b", re.I)),
]

DESIGNATION_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("Managing Director & CEO", re.compile(r"\bmd\s*(?:and|&|,)\s*ceo\b|managing director (?:and|&) ceo", re.I)),
    ("CEO",               re.compile(r"\bchief executive officer\b|\bceo\b", re.I)),
    ("CFO",               re.compile(r"\bchief financial officer\b|\bcfo\b", re.I)),
    ("COO",               re.compile(r"\bchief operating officer\b|\bcoo\b", re.I)),
    ("CTO",               re.compile(r"\bchief technology officer\b|\bcto\b", re.I)),
    ("CHRO",              re.compile(r"\bchief human resources officer\b|\bchro\b", re.I)),
    ("Managing Director", re.compile(r"\bmanaging director\b|\bmd\b", re.I)),
    ("Whole-time Director", re.compile(r"\bwhole[- ]?time director\b|\bwtd\b", re.I)),
    ("Executive Director", re.compile(r"\bexecutive director\b", re.I)),
    ("Independent Director", re.compile(r"\bindependent director\b", re.I)),
    ("Non-Executive Director", re.compile(r"\bnon[- ]?executive director\b", re.I)),
    ("Chairman",          re.compile(r"\bchairperson\b|\bchairman\b|\bchairwoman\b", re.I)),
    ("Company Secretary", re.compile(r"\bcompany secretary\b", re.I)),
    ("Compliance Officer", re.compile(r"\bcompliance officer\b", re.I)),
    ("General Counsel",   re.compile(r"\bgeneral counsel\b", re.I)),
    ("Director",          re.compile(r"\bdirector\b", re.I)),
]

# News-validation domains. Anything else is "low".
NEWS_DOMAINS = {
    "moneycontrol.com":     ("Moneycontrol",       "news"),
    "economictimes.indiatimes.com": ("ET Markets", "news"),
    "m.economictimes.com":  ("ET Markets",         "news"),
    "business-standard.com": ("Business Standard", "news"),
    "reuters.com":          ("Reuters",            "news"),
    "livemint.com":         ("Mint",               "news"),
    "thehindubusinessline.com": ("Hindu BusinessLine", "news"),
    "cnbctv18.com":         ("CNBC-TV18",          "news"),
    "bloombergquint.com":   ("BQ Prime",           "news"),
    "bqprime.com":          ("BQ Prime",           "news"),
    "ndtvprofit.com":       ("NDTV Profit",        "news"),
    "tijorifinance.com":    ("Tijori Finance",     "aggregator"),
    "trendlyne.com":        ("Trendlyne",          "aggregator"),
}

OFFICIAL_HINT_TOKENS = (
    "regulation 30", "lodr", "stock exchange", "intimation",
    "intimation to", "bse intimation", "nse intimation", "annexure",
)


# ---------------------------------------------------------------------------
# Models
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

    @property
    def id(self) -> str:
        key = f"{self.ticker}|{self.person_name.lower()}|{self.event_type}|{self.effective_date or self.announcement_date}|{urlparse(self.source_url).netloc}"
        return hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def fetch_url(url: str, *, allow_pdf: bool = True) -> tuple[str, str]:
    """Return (content_type, text). Empty string on failure. PDFs returned as ''."""
    try:
        resp = SESSION.get(url, timeout=HTTP_TIMEOUT, allow_redirects=True)
    except requests.RequestException as exc:
        print(f"  ! fetch failed {url}: {exc}", file=sys.stderr)
        return "", ""
    if resp.status_code != 200:
        print(f"  ! HTTP {resp.status_code} for {url}", file=sys.stderr)
        return "", ""
    ctype = (resp.headers.get("content-type") or "").lower()
    if "pdf" in ctype:
        return ctype, "" if not allow_pdf else "[PDF]"
    return ctype, resp.text


def fetch_feed(url: str) -> list[dict]:
    try:
        parsed = feedparser.parse(url, request_headers={"User-Agent": USER_AGENT})
    except Exception as exc:  # noqa: BLE001
        print(f"  ! feed parse failed {url}: {exc}", file=sys.stderr)
        return []
    if parsed.bozo and not parsed.entries:
        print(f"  ! bozo feed (no entries) {url}: {parsed.bozo_exception}", file=sys.stderr)
    return parsed.entries


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


_NAME_BEFORE_EVENT = re.compile(
    r"([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){1,3})\s+"
    r"(?:has\s+)?(?:appointed|joins|takes? charge|assumes? charge|"
    r"re[- ]?appointed|resigns?|resigned|tendered|stepp?ed[- ]?down|"
    r"ceased?|retir|terminated|removed|elevated|designated)",
)
_NAME_AFTER_EVENT = re.compile(
    r"(?:appoints?|appointed|elevates?|names?|welcomes?|inducts?|"
    r"reappoints?|re[- ]?appoints?|terminates?|removes?|retires?)\s+"
    r"(?:Mr\.?|Ms\.?|Mrs\.?|Dr\.?\s+)?([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){1,3})",
)
_NAME_AS_ROLE = re.compile(
    r"(?:Mr\.?|Ms\.?|Mrs\.?|Dr\.?\s+)?([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){1,3})\s+as\s+"
    r"(?:the\s+)?(?:new\s+)?(?:Chief|CEO|CFO|COO|CTO|CHRO|Managing|Whole|Executive|"
    r"Independent|Non[- ]?Executive|Chairman|Chairperson|Director|Company Secretary|"
    r"Compliance Officer|General Counsel)",
    re.I,
)

_NOISE_WORDS = {
    "Bse", "Nse", "Sebi", "Lodr", "Limited", "Company", "Ltd", "Industries",
    "Bank", "India", "Indian", "Group", "Services", "Securities",
}


def extract_person(text: str) -> str:
    for pattern in (_NAME_AS_ROLE, _NAME_AFTER_EVENT, _NAME_BEFORE_EVENT):
        match = pattern.search(text)
        if match:
            candidate = match.group(1).strip()
            tokens = candidate.split()
            if tokens and tokens[0] in _NOISE_WORDS:
                continue
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


def score_confidence(source_type: str, body_hint: str) -> str:
    body_lower = (body_hint or "").lower()
    has_official_hint = any(tok in body_lower for tok in OFFICIAL_HINT_TOKENS)
    if source_type == "ir":
        return "high"
    if source_type == "aggregator" and has_official_hint:
        return "high"
    if source_type == "aggregator":
        return "medium"
    if source_type == "news" and has_official_hint:
        return "medium"
    if source_type == "news":
        return "medium"
    return "low"


def normalize_source(url: str) -> tuple[str, str]:
    host = urlparse(url).netloc.lower().lstrip("www.")
    for domain, (name, stype) in NEWS_DOMAINS.items():
        if domain in host:
            return name, stype
    return host or "Unknown", "search"


# ---------------------------------------------------------------------------
# Sources
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


def fetch_news_events(company: dict) -> list[Event]:
    events: list[Event] = []
    seen: set[str] = set()
    feeds: list[str] = []
    feeds.extend(google_news_rss_urls(company["name"]))
    feeds.extend(bing_news_rss_urls(company["name"]))

    for url in feeds:
        for entry in fetch_feed(url):
            title = html.unescape(entry.get("title", "")).strip()
            summary = html.unescape(re.sub(r"<[^>]+>", " ", entry.get("summary", ""))).strip()
            link = entry.get("link", "")
            if not title or not link or link in seen:
                continue
            seen.add(link)

            blob = f"{title}\n{summary}"
            etype = classify_event(blob)
            if not etype:
                continue
            keywords = extract_keywords(blob)
            if not keywords and etype not in ("resignation", "appointment"):
                continue

            person = extract_person(blob)
            if not person:
                continue
            designation = classify_designation(blob)
            source_name, source_type = normalize_source(link)
            announcement_date = parse_date(entry.get("published") or entry.get("updated"))

            event = Event(
                company_name=company["name"],
                ticker=company["ticker"],
                person_name=person,
                designation=designation,
                event_type=etype,
                effective_date="",
                announcement_date=announcement_date,
                reason_for_change="",
                brief_profile="",
                term_of_appointment="",
                resignation_letter_attached="unknown",
                source_name=source_name,
                source_url=link,
                source_type=source_type,
                confidence_score=score_confidence(source_type, blob),
                matched_keywords=keywords,
            )
            events.append(event)
    return events


def fetch_tijori_events(company: dict) -> list[Event]:
    slug = (company.get("tijori_slug") or "").strip()
    if not slug:
        return []
    url = f"https://www.tijorifinance.com/company/{slug}/announcements/"
    ctype, html_text = fetch_url(url)
    if not html_text or "html" not in ctype:
        return []
    soup = BeautifulSoup(html_text, "lxml")
    events: list[Event] = []
    for row in soup.select("a, li, tr"):
        text = " ".join(row.get_text(" ", strip=True).split())
        if len(text) < 25:
            continue
        if not classify_event(text):
            continue
        if not any(kw.lower() in text.lower() for kw in EVENT_KEYWORDS):
            continue
        person = extract_person(text)
        if not person:
            continue
        link = row.find("a", href=True)
        href = link["href"] if link else url
        if href.startswith("/"):
            href = "https://www.tijorifinance.com" + href
        events.append(Event(
            company_name=company["name"],
            ticker=company["ticker"],
            person_name=person,
            designation=classify_designation(text),
            event_type=classify_event(text),
            effective_date="",
            announcement_date=parse_date(text),
            reason_for_change="",
            brief_profile="",
            term_of_appointment="",
            resignation_letter_attached="yes" if ".pdf" in href.lower() else "unknown",
            source_name="Tijori Finance",
            source_url=href,
            source_type="aggregator",
            confidence_score=score_confidence("aggregator", text),
            matched_keywords=extract_keywords(text),
        ))
    return events


def fetch_trendlyne_events(company: dict) -> list[Event]:
    slug = (company.get("trendlyne_slug") or company.get("ticker") or "").strip()
    if not slug:
        return []
    url = f"https://trendlyne.com/equity/Announcements/{slug}/"
    ctype, html_text = fetch_url(url)
    if not html_text or "html" not in ctype:
        return []
    soup = BeautifulSoup(html_text, "lxml")
    events: list[Event] = []
    for item in soup.select("tr, li, div.announcement, div.news-row"):
        text = " ".join(item.get_text(" ", strip=True).split())
        if len(text) < 25:
            continue
        if not classify_event(text):
            continue
        if not any(kw.lower() in text.lower() for kw in EVENT_KEYWORDS):
            continue
        person = extract_person(text)
        if not person:
            continue
        link = item.find("a", href=True)
        href = link["href"] if link else url
        if href.startswith("/"):
            href = "https://trendlyne.com" + href
        events.append(Event(
            company_name=company["name"],
            ticker=company["ticker"],
            person_name=person,
            designation=classify_designation(text),
            event_type=classify_event(text),
            effective_date="",
            announcement_date=parse_date(text),
            reason_for_change="",
            brief_profile="",
            term_of_appointment="",
            resignation_letter_attached="yes" if ".pdf" in href.lower() else "unknown",
            source_name="Trendlyne",
            source_url=href,
            source_type="aggregator",
            confidence_score=score_confidence("aggregator", text),
            matched_keywords=extract_keywords(text),
        ))
    return events


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
        blob = f"{title}\n{snippet}"
        etype = classify_event(blob)
        if not etype:
            continue
        person = extract_person(blob)
        if not person:
            continue
        # filetype:pdf + company-domain hosting => treat as company IR.
        host = urlparse(link).netloc.lower()
        is_company_host = (
            company["name"].split()[0].lower() in host
            or company["ticker"].lower() in host
        )
        source_type = "ir" if (is_company_host and link.lower().endswith(".pdf")) else "search"
        events.append(Event(
            company_name=company["name"],
            ticker=company["ticker"],
            person_name=person,
            designation=classify_designation(blob),
            event_type=etype,
            effective_date="",
            announcement_date="",
            reason_for_change="",
            brief_profile="",
            term_of_appointment="",
            resignation_letter_attached="yes" if link.lower().endswith(".pdf") else "unknown",
            source_name=host or "Search",
            source_url=link,
            source_type=source_type,
            confidence_score=score_confidence(source_type, blob),
            matched_keywords=extract_keywords(blob),
        ))
    return events


# ---------------------------------------------------------------------------
# Dedup + merge
# ---------------------------------------------------------------------------

def dedupe_and_rank(events: Iterable[Event]) -> list[Event]:
    """One row per (person, event_type, company). Keep the highest-confidence
    source; collapse duplicates but preserve other source URLs in matched_keywords."""
    order = {"high": 3, "medium": 2, "low": 1}
    by_key: dict[str, Event] = {}
    for ev in events:
        if not ev.person_name:
            continue
        key = f"{ev.ticker}|{ev.person_name.lower().strip()}|{ev.event_type}"
        existing = by_key.get(key)
        if not existing:
            by_key[key] = ev
            continue
        if order.get(ev.confidence_score, 0) > order.get(existing.confidence_score, 0):
            ev.matched_keywords = sorted(set(ev.matched_keywords + existing.matched_keywords))
            by_key[key] = ev
        else:
            existing.matched_keywords = sorted(
                set(existing.matched_keywords + ev.matched_keywords)
            )
    return list(by_key.values())


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
    started_at = datetime.now(timezone.utc).isoformat()

    for company in companies:
        print(f"--- {company['ticker']} : {company['name']} ---")
        gathered: list[Event] = []

        # 1) IR / search-backed PDFs (only if SERPAPI_KEY available)
        try:
            gathered.extend(fetch_serpapi_pdfs(company))
        except Exception as exc:  # noqa: BLE001
            print(f"  ! serpapi block failed: {exc}", file=sys.stderr)

        # 2) Tijori
        try:
            gathered.extend(fetch_tijori_events(company))
        except Exception as exc:  # noqa: BLE001
            print(f"  ! tijori block failed: {exc}", file=sys.stderr)

        # 3) Trendlyne
        try:
            gathered.extend(fetch_trendlyne_events(company))
        except Exception as exc:  # noqa: BLE001
            print(f"  ! trendlyne block failed: {exc}", file=sys.stderr)

        # 4) News validation (Google + Bing RSS)
        try:
            gathered.extend(fetch_news_events(company))
        except Exception as exc:  # noqa: BLE001
            print(f"  ! news block failed: {exc}", file=sys.stderr)

        ranked = dedupe_and_rank(gathered)
        print(f"  -> {len(ranked)} unique events (from {len(gathered)} raw hits)")
        all_events.extend(ranked)

        # Be polite — slight delay between companies.
        time.sleep(1.5)

    payload = {
        "generated_at": started_at,
        "company_count": len(companies),
        "event_count": len(all_events),
        "companies_tracked": [c["ticker"] for c in companies],
        "events": [{"id": ev.id, **asdict(ev)} for ev in all_events],
    }

    for target in (OUTPUT_FILE, PUBLIC_OUTPUT_FILE):
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
        print(f"wrote {target} ({len(all_events)} events)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
