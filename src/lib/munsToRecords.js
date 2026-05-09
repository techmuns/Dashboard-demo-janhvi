import { runKmpAgent } from "./munsAgent";
import { parseMunsTable } from "./munsParse";
import { munsRowsToKmpEntries } from "./munsToKmpRows";

const KIND_TO_DATE_FIELD = {
  appointments: "dateOfJoining",
  resignations: "resignationDate",
  terminations: "terminationDate",
  retirements: "retirementDate",
};

const ROLE_KEYWORDS = [
  { match: ["chief executive", "managing director", "ceo", "md & ceo"], role: "CEO" },
  { match: ["chief financial", "cfo"], role: "CFO" },
  { match: ["chief operating", "coo"], role: "COO" },
  { match: ["chief technology", "chief information", "cto", "cio"], role: "CTO" },
  { match: ["chief human", "chro", "chief people"], role: "CHRO" },
  { match: ["general counsel", "company secretary", "legal"], role: "General Counsel" },
  { match: ["chairman", "chairperson"], role: "Chairman" },
  { match: ["business unit", "head of"], role: "Business Unit Head" },
];

const KIND_TO_DEPARTMENT = {
  appointments: "the leadership team",
  resignations: "the leadership team",
  terminations: "the leadership team",
  retirements: "the leadership team",
};

const looksLikeUrl = (value) => /^https?:\/\//i.test(value || "");

function inferRole(roleText) {
  const v = (roleText || "").toLowerCase();
  for (const { match, role } of ROLE_KEYWORDS) {
    if (match.some((needle) => v.includes(needle))) return role;
  }
  return null;
}

function normalizeDate(value) {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

const fallbackDate = "1970-01-01";

export function entriesToRecords(entries, kind) {
  const dateField = KIND_TO_DATE_FIELD[kind];
  return entries.map((entry, idx) => {
    const announcementUrl = looksLikeUrl(entry.sourceName) ? entry.sourceName : undefined;
    const announcementSource = announcementUrl
      ? entry.sourceName.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0]
      : entry.sourceName || "Source";
    const role = inferRole(entry.role) || entry.role || "—";
    const effective = normalizeDate(entry.effectiveDate) || fallbackDate;
    const announced = normalizeDate(entry.sourceDate) || effective;
    const designation = entry.role || role;

    return {
      id: `live-${kind}-${idx}-${entry.id || idx}`,
      employeeId: `LIVE-${String(idx + 1).padStart(3, "0")}`,
      employeeName: entry.person,
      designation,
      role,
      department: KIND_TO_DEPARTMENT[kind],
      [dateField]: effective,
      announcementSource,
      announcementUrl,
      announcementDate: announced,
      whyItMatters: entry.whyItMatters || null,
    };
  });
}

export async function fetchAllLiveRecords({ ticker, companyName, country } = {}) {
  const kinds = Object.keys(KIND_TO_DATE_FIELD);
  const results = await Promise.all(
    kinds.map(async (kind) => {
      try {
        const raw = await runKmpAgent({ kind, ticker, companyName, country });
        const parsed = parseMunsTable(raw);
        const entries = parsed ? munsRowsToKmpEntries(parsed) : [];
        return [kind, { records: entriesToRecords(entries, kind), error: null }];
      } catch (err) {
        return [kind, { records: [], error: err instanceof Error ? err.message : String(err) }];
      }
    }),
  );
  return Object.fromEntries(results);
}
