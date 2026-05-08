export const REFERENCE_TODAY = new Date("2026-04-27T00:00:00");

const monthFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  year: "2-digit",
});

export const KMP_ROLE_META = {
  CEO: { label: "CEO", tone: "blue" },
  CFO: { label: "CFO", tone: "emerald" },
  COO: { label: "COO", tone: "teal" },
  CTO: { label: "CTO", tone: "indigo" },
  CHRO: { label: "CHRO", tone: "amber" },
  "General Counsel": { label: "General Counsel", tone: "rose" },
  Chairman: { label: "Chairman", tone: "slate" },
  "Business Unit Head": { label: "BU Head", tone: "violet" },
};

export const KMP_ROLE_ORDER = [
  "CEO",
  "CFO",
  "COO",
  "CTO",
  "CHRO",
  "General Counsel",
  "Chairman",
  "Business Unit Head",
];

export function filterByRoles(records, roles) {
  if (!roles || !roles.length) {
    return records;
  }
  const roleSet = new Set(roles);
  return records.filter((record) => roleSet.has(record.role));
}

export function parseDate(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

export function formatDate(dateString) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parseDate(dateString));
}

export function formatCompactNumber(value) {
  return new Intl.NumberFormat("en-IN", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

export function getInitials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function getRelevantDateField(type) {
  return {
    appointments: "dateOfJoining",
    resignations: "resignationDate",
    terminations: "terminationDate",
    retirements: "retirementDate",
  }[type];
}

function startOfDay(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function endOfDay(date) {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
}

function shiftMonths(date, months) {
  const shifted = new Date(date);
  shifted.setMonth(shifted.getMonth() + months);
  return shifted;
}

function shiftDays(date, days) {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

function getDatasetBounds(company) {
  const allDates = [
    ...company.appointments.map((record) => record.dateOfJoining),
    ...company.resignations.map((record) => record.resignationDate),
    ...company.terminations.map((record) => record.terminationDate),
    ...company.retirements.map((record) => record.retirementDate),
  ].map(parseDate);

  const earliest = allDates.reduce((min, date) => (date < min ? date : min), allDates[0]);
  return {
    start: startOfDay(earliest),
    end: endOfDay(REFERENCE_TODAY),
  };
}

export function getDateRangeMeta(company, range) {
  if (range === "all") {
    return getDatasetBounds(company);
  }

  const months = Number(range);
  return {
    start: startOfDay(shiftMonths(REFERENCE_TODAY, -months)),
    end: endOfDay(REFERENCE_TODAY),
  };
}

function getPreviousRange(company, range) {
  if (range === "all") {
    return null;
  }

  const current = getDateRangeMeta(company, range);
  const previousEnd = endOfDay(shiftDays(current.start, -1));
  const previousStart = startOfDay(shiftMonths(current.start, -Number(range)));
  return { start: previousStart, end: previousEnd };
}

export function filterRecordsByDateRange(records, type, range, company) {
  const { start, end } = getDateRangeMeta(company, range);
  const key = getRelevantDateField(type);

  return records.filter((record) => {
    const value = parseDate(record[key]);
    return value >= start && value <= end;
  });
}

function countInWindow(records, dateField, start, end) {
  return records.filter((record) => {
    const value = parseDate(record[dateField]);
    return value >= start && value <= end;
  }).length;
}

function getChangeText(current, previous) {
  if (!previous) {
    return "Benchmark unavailable";
  }

  if (previous === 0 && current === 0) {
    return "No change from prior period";
  }

  if (previous === 0) {
    return "New activity in current period";
  }

  const delta = ((current - previous) / previous) * 100;
  const prefix = delta >= 0 ? "+" : "";
  return `${prefix}${delta.toFixed(0)}% from previous period`;
}

function getPointText(current, previous) {
  const delta = current - previous;
  if (Math.abs(delta) < 0.05) {
    return "Flat versus previous period";
  }

  const prefix = delta >= 0 ? "+" : "";
  return `${prefix}${delta.toFixed(1)} pts from previous period`;
}

function monthKey(date) {
  const parsed = parseDate(date);
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthSeries(start, end) {
  const months = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const limit = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= limit) {
    months.push({
      key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
      month: monthFormatter.format(cursor),
      appointments: 0,
      exits: 0,
      attritionRate: 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function aggregateDepartmentMovement(filtered) {
  const map = new Map();

  filtered.appointments.forEach((record) => {
    const existing = map.get(record.department) ?? {
      department: record.department,
      appointments: 0,
      exits: 0,
    };
    existing.appointments += 1;
    map.set(record.department, existing);
  });

  [...filtered.resignations, ...filtered.terminations, ...filtered.retirements].forEach((record) => {
    const existing = map.get(record.department) ?? {
      department: record.department,
      appointments: 0,
      exits: 0,
    };
    existing.exits += 1;
    map.set(record.department, existing);
  });

  return [...map.values()].sort((left, right) => right.appointments + right.exits - (left.appointments + left.exits));
}

function topDepartment(data, field) {
  if (!data.length) {
    return "No movement recorded";
  }

  const winner = data.reduce((best, item) => (item[field] > best[field] ? item : best), data[0]);
  return `${winner.department} (${winner[field]})`;
}

export function buildEmployeeTimeline(record, type) {
  const joinDate = record.dateOfJoining;
  const lifecycleDate =
    type === "appointments"
      ? record.dateOfJoining
      : type === "resignations"
        ? record.resignationDate
        : type === "terminations"
          ? record.terminationDate
          : record.retirementDate;

  const events = [
    {
      label: "Leadership role commenced",
      date: joinDate,
      detail: `${record.designation} in ${record.department} (${record.roleCategory})`,
    },
  ];

  if (record.announcementDate) {
    events.push({
      label: "Announcement filed",
      date: record.announcementDate,
      detail: `${record.announcementSource} — ${record.announcementHeadline}`,
    });
  }

  if (type === "appointments") {
    events.push(
      {
        label: "Appointment record created",
        date: record.createdDate,
        detail: `${record.employmentType} initiated by ${record.reportingManager}`,
      },
      {
        label: "Leadership onboarding updated",
        date: lifecycleDate,
        detail: `${record.status} under ${record.reportingManager}`,
      },
    );
  }

  if (type === "resignations") {
    events.push(
      {
        label: "Resignation submitted",
        date: record.resignationDate,
        detail: record.reasonForLeaving,
      },
      {
        label: "Leadership handover completion",
        date: record.lastWorkingDay,
        detail: `Notice status: ${record.noticePeriodStatus}`,
      },
    );
  }

  if (type === "terminations") {
    events.push(
      {
        label: "Board-approved separation",
        date: record.terminationDate,
        detail: `Approved by ${record.approvedBy}`,
      },
      {
        label: "Closure and settlement progress",
        date: record.terminationDate,
        detail: `Settlement status: ${record.finalSettlementStatus}`,
      },
    );
  }

  if (type === "retirements") {
    events.push(
      {
        label: "Retirement effective",
        date: record.retirementDate,
        detail: `${record.retirementType} at age ${record.ageAtRetirement}`,
      },
      {
        label: "Succession and knowledge transition",
        date: record.retirementDate,
        detail: record.knowledgeTransferStatus,
      },
    );
  }

  return events.sort((left, right) => parseDate(left.date) - parseDate(right.date));
}

export function createExportPayload(company, snapshot, selectedRange) {
  return {
    company: company.name,
    dateRange: selectedRange,
    generatedOn: REFERENCE_TODAY.toISOString().slice(0, 10),
    kpis: snapshot.kpis,
    analysis: snapshot.analysisCards,
    tables: snapshot.filteredRecords,
  };
}

export function buildDashboardSnapshot(company, range) {
  const filtered = {
    appointments: filterRecordsByDateRange(company.appointments, "appointments", range, company),
    resignations: filterRecordsByDateRange(company.resignations, "resignations", range, company),
    terminations: filterRecordsByDateRange(company.terminations, "terminations", range, company),
    retirements: filterRecordsByDateRange(company.retirements, "retirements", range, company),
  };

  const exitsCount =
    filtered.resignations.length + filtered.terminations.length + filtered.retirements.length;
  const netHeadcountChange = filtered.appointments.length - exitsCount;
  const averageHeadcount = (company.previousHeadcount + company.totalEmployees) / 2;
  const attritionRate = Number(((exitsCount / averageHeadcount) * 100).toFixed(1));
  const upcomingRetirements = company.upcomingRetirements.filter(
    (record) => parseDate(record.retirementDate) > REFERENCE_TODAY,
  );

  const previousRange = getPreviousRange(company, range);
  const previousCounts = previousRange
    ? {
        appointments: countInWindow(
          company.appointments,
          "dateOfJoining",
          previousRange.start,
          previousRange.end,
        ),
        resignations: countInWindow(
          company.resignations,
          "resignationDate",
          previousRange.start,
          previousRange.end,
        ),
        terminations: countInWindow(
          company.terminations,
          "terminationDate",
          previousRange.start,
          previousRange.end,
        ),
        retirements: countInWindow(
          company.retirements,
          "retirementDate",
          previousRange.start,
          previousRange.end,
        ),
      }
    : company.baselines;

  const previousExits =
    previousCounts.resignations + previousCounts.terminations + previousCounts.retirements;
  const previousAverageHeadcount = (company.previousHeadcount + company.previousHeadcount - 24) / 2;
  const previousAttritionRate = previousRange
    ? Number(((previousExits / previousAverageHeadcount) * 100).toFixed(1))
    : company.baselines.attritionRate;

  const kpis = [
    {
      key: "appointments",
      label: "KMP Appointments",
      value: filtered.appointments.length,
      comparison: getChangeText(filtered.appointments.length, previousCounts.appointments),
      color: "emerald",
    },
    {
      key: "resignations",
      label: "KMP Resignations",
      value: filtered.resignations.length,
      comparison: getChangeText(filtered.resignations.length, previousCounts.resignations),
      color: "amber",
    },
    {
      key: "terminations",
      label: "KMP Terminations",
      value: filtered.terminations.length,
      comparison: getChangeText(filtered.terminations.length, previousCounts.terminations),
      color: "rose",
    },
    {
      key: "netHeadcountChange",
      label: "Net KMP Change",
      value: netHeadcountChange,
      comparison: getChangeText(netHeadcountChange, company.baselines.netChange),
      color: "slate",
    },
    {
      key: "totalEmployees",
      label: "Total KMP Roles",
      value: company.totalEmployees,
      comparison: getChangeText(company.totalEmployees, company.previousHeadcount),
      color: "blue",
    },
    {
      key: "retirements",
      label: "KMP Retirements",
      value: filtered.retirements.length,
      comparison: getChangeText(filtered.retirements.length, previousCounts.retirements),
      color: "teal",
    },
    {
      key: "attritionRate",
      label: "KMP Attrition Rate",
      value: `${attritionRate}%`,
      comparison: getPointText(attritionRate, previousAttritionRate),
      color: "amber",
    },
    {
      key: "upcomingRetirements",
      label: "Upcoming KMP Retirements",
      value: upcomingRetirements.length,
      comparison: getChangeText(upcomingRetirements.length, company.baselines.upcomingRetirements),
      color: "blue",
    },
  ];

  const { start, end } = getDateRangeMeta(company, range);
  const monthlyMovement = buildMonthSeries(start, end).map((month) => {
    const appointments = filtered.appointments.filter(
      (record) => monthKey(record.dateOfJoining) === month.key,
    ).length;
    const exits =
      filtered.resignations.filter((record) => monthKey(record.resignationDate) === month.key).length +
      filtered.terminations.filter((record) => monthKey(record.terminationDate) === month.key).length +
      filtered.retirements.filter((record) => monthKey(record.retirementDate) === month.key).length;

    return {
      ...month,
      appointments,
      exits,
      attritionRate: Number(((exits / averageHeadcount) * 100).toFixed(1)),
    };
  });

  const departmentMovement = aggregateDepartmentMovement(filtered).slice(0, 8);
  const statusDistribution = [
    { name: "Active Leadership", value: company.activeEmployees },
    { name: "Appointed", value: filtered.appointments.length },
    { name: "Resigned", value: filtered.resignations.length },
    { name: "Terminated", value: filtered.terminations.length },
    { name: "Retired", value: filtered.retirements.length },
  ];

  const highestHiring = topDepartment(departmentMovement, "appointments");
  const highestExits = topDepartment(departmentMovement, "exits");
  const exitPressure = departmentMovement.find((item) => item.exits > item.appointments);
  const analysisCards = [
    {
      title: "KMP Hiring Momentum",
      value: highestHiring,
      description: `${filtered.appointments.length} KMP appointments captured from announcements in the selected window.`,
      tone: "emerald",
    },
    {
      title: "KMP Exit Pressure",
      value: highestExits,
      description: exitPressure
        ? `${exitPressure.department} shows higher KMP exits than appointments in the current period.`
        : "No KMP function is showing outsized exit pressure in the selected period.",
      tone: "amber",
    },
    {
      title: "Succession Watch",
      value: `${upcomingRetirements.length} upcoming`,
      description: "Succession planning should focus on tenured KMP and regulated governance roles.",
      tone: "blue",
    },
    {
      title: "KMP Stability",
      value: netHeadcountChange >= 0 ? "Stable to positive" : "Watch closely",
      description: "Balance between KMP appointments and exits remains manageable across key functions.",
      tone: "teal",
    },
    {
      title: "Net KMP Balance",
      value: `${netHeadcountChange >= 0 ? "+" : ""}${netHeadcountChange}`,
      description: "Net KMP change is the clearest near-term indicator of governance and management depth.",
      tone: "slate",
    },
  ];

  const insights = [
    `${highestHiring.split(" (")[0]} had the most KMP appointments in the selected period.`,
    `${highestExits.split(" (")[0]} recorded the most KMP exits in the selected period.`,
    upcomingRetirements.length
      ? `Upcoming retirements may create KMP succession needs in ${upcomingRetirements[0].department}.`
      : "No immediate KMP retirement pressure is visible in the next planning window.",
    netHeadcountChange >= 0
      ? "Net KMP capacity is positive for the selected company."
      : "KMP exits are currently outpacing appointments and should be reviewed.",
  ];

  return {
    filteredRecords: filtered,
    kpis,
    monthlyMovement,
    statusDistribution,
    departmentMovement,
    analysisCards,
    insights,
    netHeadcountChange,
    attritionRate,
    upcomingRetirements,
  };
}
