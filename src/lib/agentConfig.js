// Single replaceable spot for the MUNS bearer token + agent wiring.
// Swap MUNS_TOKEN here when it expires.

export const MUNS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ZWE5ZGMyYi0xZDBmLTQ2MzctOGE2Ny0wM2VhNzFmMGYyY2YiLCJlbWFpbCI6Im5hZGFtc2FsdWphQGdtYWlsLmNvbSIsIm9yZ0lkIjoiMSIsImF1dGhvcml0eSI6ImFkbWluIiwiaWF0IjoxNzc3OTgzNTUzLCJleHAiOjE3Nzg0MTU1NTN9.IQKdGF0H3E_KzCy5h5dyTAIFgSMkbHQ5PEtNjtEVY_c";

export const MUNS_AGENT_ENDPOINT = "https://devde.muns.io/agents/run";

export const KMP_APPOINTMENTS_AGENT_ID = "e570e8dc-f9df-4d7b-bbd0-de58c5c7a49b";

export const DEFAULT_AGENT_METADATA = {
  stock_ticker: "JIOFIN",
  stock_company_name: "Jio Financial Services Ltd.",
  context_company_name: "Jio Financial Services Ltd.",
  stock_country: "INDIA",
  timezone: "UTC",
};
