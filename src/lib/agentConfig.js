// Single replaceable spot for the MUNS bearer token + agent wiring.
// Token is injected at build time from MUNS_ACCESS_TOKEN (Cloudflare Pages
// env var / local .env). Never commit the token value.

export const MUNS_TOKEN = import.meta.env.MUNS_ACCESS_TOKEN;

export const MUNS_AGENT_ENDPOINT = "https://devde.muns.io/agents/run";

export const MUNS_USER_INDEX = 124;

// Backwards-compatible single export still used by older code paths.
export const KMP_APPOINTMENTS_AGENT_ID = "e570e8dc-f9df-4d7b-bbd0-de58c5c7a49b";

export const KMP_AGENTS = {
  appointments: {
    id: "e570e8dc-f9df-4d7b-bbd0-de58c5c7a49b",
    label: "appointments",
    title: "Live KMP appointments",
    blurb:
      "Pull verified Key Managerial Personnel appointments for any listed company straight from official announcements.",
  },
  resignations: {
    id: "0053242d-6f6e-41a1-aa00-02bca8e7c1ce",
    label: "resignations",
    title: "Live KMP resignations",
    blurb:
      "Pull verified Key Managerial Personnel resignations and cessations from official disclosures.",
  },
  terminations: {
    id: "f900b1d1-29f6-4ab9-b730-12cc899ad2d8",
    label: "terminations",
    title: "Live KMP terminations",
    blurb:
      "Pull board-driven Key Managerial Personnel terminations and removals from official disclosures.",
  },
  retirements: {
    id: "c42c5eb1-48e1-4c83-bc02-5c6a18783ac8",
    label: "retirements",
    title: "Live KMP retirements",
    blurb:
      "Pull planned Key Managerial Personnel retirements and successions from official disclosures.",
  },
};

export const DEFAULT_AGENT_METADATA = {
  stock_ticker: "JIOFIN",
  stock_company_name: "Jio Financial Services Ltd.",
  context_company_name: "Jio Financial Services Ltd.",
  stock_country: "INDIA",
  timezone: "UTC",
};
