import { fetchAllLiveRecords } from "./munsToRecords";

export { fetchAllLiveRecords };

export function buildLiveCompany({ remoteCompany, liveRecords, fallback }) {
  if (!remoteCompany) return null;

  const apps = liveRecords?.appointments?.records || [];
  const res = liveRecords?.resignations?.records || [];
  const term = liveRecords?.terminations?.records || [];
  const ret = liveRecords?.retirements?.records || [];

  const total = apps.length + res.length + term.length + ret.length;
  // Avoid divide-by-zero in attritionRate calc inside buildDashboardSnapshot.
  const totalEmployees = Math.max(total, 1);
  const activeEmployees = Math.max(0, apps.length - res.length - term.length - ret.length);

  return {
    id: `live-${remoteCompany.ticker}`,
    name: remoteCompany.name,
    sector: remoteCompany.industry || fallback?.sector || "—",
    headquarters: remoteCompany.country || fallback?.headquarters || "—",
    totalEmployees,
    previousHeadcount: totalEmployees,
    activeEmployees,
    accent: fallback?.accent || "brand.blue",
    baselines: {
      appointments: 0,
      resignations: 0,
      terminations: 0,
      retirements: 0,
      attritionRate: 0,
      upcomingRetirements: 0,
      netChange: 0,
    },
    appointments: apps,
    resignations: res,
    terminations: term,
    retirements: ret,
    upcomingRetirements: [],
  };
}
