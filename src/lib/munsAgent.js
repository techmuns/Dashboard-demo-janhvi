import {
  MUNS_TOKEN,
  MUNS_AGENT_ENDPOINT,
  KMP_APPOINTMENTS_AGENT_ID,
  DEFAULT_AGENT_METADATA,
} from "./agentConfig";

export async function runKmpAppointmentsAgent({ ticker, companyName, country, toDate } = {}) {
  const metadata = {
    ...DEFAULT_AGENT_METADATA,
    ...(ticker ? { stock_ticker: ticker } : {}),
    ...(companyName
      ? { stock_company_name: companyName, context_company_name: companyName }
      : {}),
    ...(country ? { stock_country: country } : {}),
    to_date: toDate || new Date().toISOString().slice(0, 10),
  };

  const response = await fetch(MUNS_AGENT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MUNS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent_library_id: KMP_APPOINTMENTS_AGENT_ID,
      metadata,
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`MUNS request failed (${response.status}). ${raw.slice(0, 200)}`);
  }
  return raw;
}
