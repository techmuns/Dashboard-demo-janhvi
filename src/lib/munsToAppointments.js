import { findColumn } from "./munsParse";

const APPOINTMENT_HINTS = ["appoint", "induct"];
const RESIGNATION_HINTS = ["resign", "cessation", "step", "exit"];
const TERMINATION_HINTS = ["terminat", "removal", "dismiss"];
const RETIREMENT_HINTS = ["retire"];

const matches = (value, hints) => hints.some((h) => value.toLowerCase().includes(h));

export function classifyChange(value) {
  const v = (value || "").trim();
  if (!v) return "unknown";
  if (matches(v, APPOINTMENT_HINTS)) return "appointment";
  if (matches(v, RESIGNATION_HINTS)) return "resignation";
  if (matches(v, TERMINATION_HINTS)) return "termination";
  if (matches(v, RETIREMENT_HINTS)) return "retirement";
  return "other";
}

export function munsRowsToAppointments(parsed) {
  if (!parsed || parsed.rows.length === 0) return [];
  const { columns, rows } = parsed;

  const personCol = findColumn(columns, "person", "name");
  const roleCol = findColumn(columns, "role", "designation", "position");
  const changeCol = findColumn(columns, "change", "type", "event");
  const effectiveCol = findColumn(columns, "effective", "joining", "appointment date");
  const whyCol = findColumn(columns, "why", "rationale", "matter");
  const sourceCol = findColumn(columns, "source name", "source");
  const sourceDateCol = findColumn(columns, "source date", "filing", "announcement date");

  const isJunkValue = (v) => !v || v === "—" || v === "-" || v.toLowerCase().includes("no qualifying");

  return rows
    .map((row, idx) => {
      const person = (personCol && row[personCol]) || "";
      if (isJunkValue(person)) return null;

      const change = (changeCol && row[changeCol]) || "";
      return {
        id: `muns-${idx}`,
        person,
        role: (roleCol && row[roleCol]) || "",
        changeType: change,
        kind: classifyChange(change),
        effectiveDate: (effectiveCol && row[effectiveCol]) || "",
        whyItMatters: (whyCol && row[whyCol]) || "",
        sourceName: (sourceCol && row[sourceCol]) || "",
        sourceDate: (sourceDateCol && row[sourceDateCol]) || "",
      };
    })
    .filter(Boolean);
}
