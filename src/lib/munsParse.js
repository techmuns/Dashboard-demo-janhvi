// Minimal MUNS response parser. Locate the markdown table in the body, return
// { columns, rows } with defensive cell padding/truncation.

const SEPARATOR_RE = /^\|?[\s|\-:]+\|?$/;
const STOP_TAG_RE = /<\/(ans|task|summary|conclusion)>|<summary>|<conclusion>|<eos>/i;

const splitCells = (line) =>
  line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.replace(/\*\*/g, "").trim());

const isSeparator = (line) => {
  const trimmed = line.trim();
  return SEPARATOR_RE.test(trimmed) && trimmed.includes("-");
};

const isTagOnly = (line) => /^<[^>]+>$/.test(line.trim());

export function parseMunsTable(body) {
  if (!body) return null;
  const lines = body.split("\n");

  let sepIdx = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (isSeparator(lines[i])) {
      sepIdx = i;
      break;
    }
  }
  if (sepIdx === -1) return null;

  const headerLine = lines[sepIdx - 1].replace(/^<ans>\s*/i, "").trim();
  const columns = splitCells(headerLine);
  if (columns.length === 0) return null;

  const rows = [];
  for (let i = sepIdx + 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    if (isTagOnly(trimmed)) break;

    const beforeStop = trimmed.replace(STOP_TAG_RE, "").trim();
    const stops = beforeStop !== trimmed;

    if (!beforeStop.includes("|")) {
      if (stops) break;
      continue;
    }

    const cells = splitCells(beforeStop);
    const row = {};
    columns.forEach((col, idx) => {
      row[col] = (cells[idx] ?? "").trim();
    });
    rows.push(row);
    if (stops) break;
  }

  return { columns, rows };
}

export function findColumn(columns, ...needles) {
  const lower = columns.map((c) => c.toLowerCase());
  for (const needle of needles) {
    const idx = lower.findIndex((c) => c.includes(needle));
    if (idx >= 0) return columns[idx];
  }
  return null;
}
