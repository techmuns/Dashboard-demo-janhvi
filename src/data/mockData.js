const KMP_ROLE_CEO = "CEO";
const KMP_ROLE_CFO = "CFO";
const KMP_ROLE_COO = "COO";
const KMP_ROLE_CTO = "CTO";
const KMP_ROLE_CHRO = "CHRO";
const KMP_ROLE_GC = "General Counsel";
const KMP_ROLE_CHAIR = "Chairman";
const KMP_ROLE_BU = "Business Unit Head";

export const KMP_ROLES = [
  KMP_ROLE_CEO,
  KMP_ROLE_CFO,
  KMP_ROLE_COO,
  KMP_ROLE_CTO,
  KMP_ROLE_CHRO,
  KMP_ROLE_GC,
  KMP_ROLE_CHAIR,
  KMP_ROLE_BU,
];

const designationByRole = {
  [KMP_ROLE_CEO]: ["Chief Executive Officer", "Group Chief Executive Officer"],
  [KMP_ROLE_CFO]: ["Chief Financial Officer", "Group Chief Financial Officer"],
  [KMP_ROLE_COO]: ["Chief Operating Officer", "Group Chief Operating Officer"],
  [KMP_ROLE_CTO]: ["Chief Technology Officer", "Chief Information Officer"],
  [KMP_ROLE_CHRO]: ["Chief Human Resources Officer", "Chief People Officer"],
  [KMP_ROLE_GC]: ["General Counsel", "Group General Counsel"],
  [KMP_ROLE_CHAIR]: [
    "Chairman",
    "Chairperson",
    "Board Chair",
    "Executive Chairman",
    "Non-Executive Chairperson",
  ],
  [KMP_ROLE_BU]: [
    "Head – Consumer Business",
    "Head – Industrial Products",
    "Head – Digital Banking",
    "Head – International Markets",
    "Head – Commercial Lending",
    "Head – Retail Operations",
  ],
};

const functionByRole = {
  [KMP_ROLE_CEO]: "Office of the CEO",
  [KMP_ROLE_CFO]: "Finance",
  [KMP_ROLE_COO]: "Operations",
  [KMP_ROLE_CTO]: "Technology",
  [KMP_ROLE_CHRO]: "People & Culture",
  [KMP_ROLE_GC]: "Legal & Compliance",
  [KMP_ROLE_CHAIR]: "Board",
  [KMP_ROLE_BU]: "Business Unit",
};

const roleCategoryByRole = {
  [KMP_ROLE_CEO]: "Key Managerial Personnel",
  [KMP_ROLE_CFO]: "Key Managerial Personnel",
  [KMP_ROLE_COO]: "CXO Leadership",
  [KMP_ROLE_CTO]: "CXO Leadership",
  [KMP_ROLE_CHRO]: "CXO Leadership",
  [KMP_ROLE_GC]: "Compliance Leadership",
  [KMP_ROLE_CHAIR]: "Board-Level Executive",
  [KMP_ROLE_BU]: "Business Unit Leadership",
};

const locations = ["Mumbai", "Delhi", "Bengaluru", "Pune", "Hyderabad", "Chennai"];

const appointmentTypes = [
  "Executive Appointment",
  "Board Appointment",
  "Whole-Time Appointment",
  "Leadership Appointment",
];

const appointmentNames = [
  "Ananya Rao",
  "Rohan Mehta",
  "Diya Menon",
  "Karan Malhotra",
  "Ishita Kulkarni",
  "Vikram Bedi",
  "Meera Nair",
  "Sahil Kapoor",
];

const resignationNames = [
  "Prerna Shah",
  "Amit Tiwari",
  "Nidhi Chopra",
  "Harsh Vora",
  "Tanvi Arora",
  "Gaurav Sethi",
  "Neha Sinha",
  "Rahul Dutta",
];

const terminationNames = [
  "Sonia Ghosh",
  "Deepak Khanna",
  "Kriti Bansal",
  "Varun Das",
  "Sneha Verma",
  "Mohit Jain",
  "Aarti Iyer",
  "Yash Wagle",
];

const retirementNames = [
  "Rajiv Bhatt",
  "Seema Pillai",
  "Ajay Narang",
  "Kalpana Reddy",
  "Mukesh Sharma",
  "Lata Deshpande",
  "Nirmal Singh",
  "Veena Chatterjee",
];

const appointingAuthorities = [
  "Board of Directors",
  "Nomination & Remuneration Committee",
  "Chairperson",
  "Managing Director",
  "Audit Committee",
  "Group CEO",
  "Executive Committee",
  "Promoter Board",
];

const announcementSources = [
  "BSE Filing",
  "NSE Filing",
  "Company Press Release",
  "Annual Report Disclosure",
  "Regulatory Notice",
];

const roleSequence = [
  KMP_ROLE_CEO,
  KMP_ROLE_CFO,
  KMP_ROLE_COO,
  KMP_ROLE_CTO,
  KMP_ROLE_CHRO,
  KMP_ROLE_GC,
  KMP_ROLE_CHAIR,
  KMP_ROLE_BU,
];

const appointmentDates = [
  "2025-05-14",
  "2025-06-18",
  "2025-07-09",
  "2025-08-22",
  "2025-09-16",
  "2025-11-07",
  "2026-01-21",
  "2026-03-12",
];

const resignationDates = [
  "2025-05-28",
  "2025-06-26",
  "2025-08-03",
  "2025-09-25",
  "2025-11-18",
  "2026-01-09",
  "2026-02-23",
  "2026-04-11",
];

const terminationDates = [
  "2025-05-19",
  "2025-07-01",
  "2025-08-14",
  "2025-10-03",
  "2025-11-29",
  "2026-01-15",
  "2026-03-04",
  "2026-04-18",
];

const retirementDates = [
  "2025-05-31",
  "2025-07-18",
  "2025-09-12",
  "2025-10-27",
  "2025-12-08",
  "2026-01-28",
  "2026-03-16",
  "2026-04-24",
];

const terminationReasons = [
  "Board-directed role closure after restructuring",
  "Governance breach disclosed in announcement",
  "Leadership performance review outcome",
  "Strategic role consolidation",
  "Compliance lapse",
  "Business unit closure",
  "Conduct matter",
  "Transition after board review",
];

const resignationReasons = [
  "Accepted another board mandate",
  "Strategic career move",
  "Relocation",
  "Transition to advisory portfolio",
  "Promoter-led succession change",
  "Retained for independent consulting",
  "Personal priorities",
  "New entrepreneurial venture",
];

const companyCatalog = [
  {
    id: "munshot-tech",
    name: "Munshot Technologies",
    sector: "Technology Services",
    headquarters: "Bengaluru",
    totalEmployees: 18,
    previousHeadcount: 17,
    activeEmployees: 15,
    accent: "brand.blue",
    baselines: {
      appointments: 2,
      resignations: 1,
      terminations: 1,
      retirements: 1,
      attritionRate: 5.9,
      upcomingRetirements: 1,
      netChange: -1,
    },
  },
  {
    id: "astra-mfg",
    name: "Astra Manufacturing Ltd.",
    sector: "Industrial Manufacturing",
    headquarters: "Pune",
    totalEmployees: 22,
    previousHeadcount: 21,
    activeEmployees: 18,
    accent: "brand.teal",
    baselines: {
      appointments: 2,
      resignations: 1,
      terminations: 1,
      retirements: 1,
      attritionRate: 4.8,
      upcomingRetirements: 2,
      netChange: -1,
    },
  },
  {
    id: "nova-retail",
    name: "Nova Retail Group",
    sector: "Retail & Consumer",
    headquarters: "Mumbai",
    totalEmployees: 19,
    previousHeadcount: 18,
    activeEmployees: 15,
    accent: "brand.emerald",
    baselines: {
      appointments: 1,
      resignations: 2,
      terminations: 1,
      retirements: 1,
      attritionRate: 6.7,
      upcomingRetirements: 1,
      netChange: -3,
    },
  },
  {
    id: "zenith-finserv",
    name: "Zenith Finserv",
    sector: "Financial Services",
    headquarters: "Mumbai",
    totalEmployees: 16,
    previousHeadcount: 15,
    activeEmployees: 13,
    accent: "brand.amber",
    baselines: {
      appointments: 1,
      resignations: 1,
      terminations: 1,
      retirements: 1,
      attritionRate: 6.3,
      upcomingRetirements: 1,
      netChange: -2,
    },
  },
  {
    id: "greenline-logistics",
    name: "Greenline Logistics",
    sector: "Logistics & Supply Chain",
    headquarters: "Chennai",
    totalEmployees: 20,
    previousHeadcount: 19,
    activeEmployees: 16,
    accent: "brand.rose",
    baselines: {
      appointments: 2,
      resignations: 1,
      terminations: 1,
      retirements: 1,
      attritionRate: 5.3,
      upcomingRetirements: 2,
      netChange: -1,
    },
  },
];

function formatIso(date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

function addDays(dateString, days) {
  const date = parseDate(dateString);
  date.setDate(date.getDate() + days);
  return formatIso(date);
}

function addMonths(dateString, months) {
  const date = parseDate(dateString);
  date.setMonth(date.getMonth() + months);
  return formatIso(date);
}

function pickRole(index, companyIndex, offset = 0) {
  return roleSequence[(index + companyIndex + offset) % roleSequence.length];
}

function getDesignation(role, index) {
  const options = designationByRole[role];
  return options[index % options.length];
}

function getEmployeeId(companyId, prefix, index) {
  return `${companyId.slice(0, 3).toUpperCase()}-${prefix}-${String(index + 1).padStart(3, "0")}`;
}

function pickSource(index, companyIndex) {
  return announcementSources[(index + companyIndex) % announcementSources.length];
}

function buildAnnouncementMeta(company, eventDate, role, kind, index, companyIndex) {
  const announcementDate = addDays(eventDate, -7 - (index % 5));
  const source = pickSource(index, companyIndex);
  const filingId = `${company.id.slice(0, 3).toUpperCase()}-${kind}-${String(index + 1).padStart(4, "0")}`;
  const headline =
    kind === "APP"
      ? `${company.name} announces appointment of ${role}`
      : kind === "RES"
        ? `${company.name} reports resignation of ${role}`
        : kind === "TER"
          ? `${company.name} announces cessation of ${role}`
          : `${company.name} notifies retirement of ${role}`;

  return {
    announcementDate,
    announcementSource: source,
    announcementId: filingId,
    announcementHeadline: headline,
    announcementUrl: `https://announcements.example.com/${company.id}/${filingId.toLowerCase()}`,
  };
}

function buildAppointments(company, companyIndex) {
  return appointmentDates.map((joinDate, index) => {
    const role = pickRole(index, companyIndex);
    const leadershipFunction = functionByRole[role];
    const employeeName = appointmentNames[(index + companyIndex) % appointmentNames.length];
    const dateOfJoining = addDays(joinDate, companyIndex * 4);
    const roleCategory = roleCategoryByRole[role];
    const designation = getDesignation(role, index + companyIndex);
    const announcement = buildAnnouncementMeta(
      company,
      dateOfJoining,
      designation,
      "APP",
      index,
      companyIndex,
    );

    return {
      id: `${company.id}-appointment-${index + 1}`,
      employeeId: getEmployeeId(company.id, "APP", index),
      employeeName,
      department: leadershipFunction,
      roleCategory,
      role,
      designation,
      dateOfJoining,
      employmentType: appointmentTypes[index % appointmentTypes.length],
      reportingManager: appointingAuthorities[(index + 2 + companyIndex) % appointingAuthorities.length],
      location: locations[(index + companyIndex) % locations.length],
      status: index > 5 ? "Pending" : "Appointed",
      createdDate: addDays(dateOfJoining, -14 - companyIndex),
      remarks: `${employeeName} was appointed as ${designation} per the ${announcement.announcementSource} dated ${announcement.announcementDate}.`,
      lifecycleType: "appointment",
      ...announcement,
    };
  });
}

function buildResignations(company, companyIndex) {
  return resignationDates.map((eventDate, index) => {
    const role = pickRole(index, companyIndex, 1);
    const leadershipFunction = functionByRole[role];
    const employeeName = resignationNames[(index + companyIndex) % resignationNames.length];
    const resignationDate = addDays(eventDate, companyIndex * 5);
    const roleCategory = roleCategoryByRole[role];
    const designation = getDesignation(role, index + 1);
    const announcement = buildAnnouncementMeta(
      company,
      resignationDate,
      designation,
      "RES",
      index,
      companyIndex,
    );

    return {
      id: `${company.id}-resignation-${index + 1}`,
      employeeId: getEmployeeId(company.id, "RES", index),
      employeeName,
      department: leadershipFunction,
      roleCategory,
      role,
      designation,
      dateOfJoining: addMonths(resignationDate, -30 - index),
      resignationDate,
      lastWorkingDay: addDays(resignationDate, 45),
      reasonForLeaving: resignationReasons[index % resignationReasons.length],
      exitInterviewStatus: index % 3 === 0 ? "Scheduled" : "Completed",
      noticePeriodStatus: index % 4 === 0 ? "Waived" : "Served",
      location: locations[(index + companyIndex + 1) % locations.length],
      reportingManager: appointingAuthorities[(index + 3 + companyIndex) % appointingAuthorities.length],
      status: "Resigned",
      remarks: `${employeeName} stepped down as ${designation}; transition disclosed via ${announcement.announcementSource}.`,
      lifecycleType: "resignation",
      ...announcement,
    };
  });
}

function buildTerminations(company, companyIndex) {
  return terminationDates.map((eventDate, index) => {
    const role = pickRole(index, companyIndex, 2);
    const leadershipFunction = functionByRole[role];
    const employeeName = terminationNames[(index + companyIndex) % terminationNames.length];
    const terminationDate = addDays(eventDate, companyIndex * 3);
    const roleCategory = roleCategoryByRole[role];
    const designation = getDesignation(role, index + 2);
    const announcement = buildAnnouncementMeta(
      company,
      terminationDate,
      designation,
      "TER",
      index,
      companyIndex,
    );

    return {
      id: `${company.id}-termination-${index + 1}`,
      employeeId: getEmployeeId(company.id, "TER", index),
      employeeName,
      department: leadershipFunction,
      roleCategory,
      role,
      designation,
      dateOfJoining: addMonths(terminationDate, -36 - index),
      terminationDate,
      terminationReason: terminationReasons[index % terminationReasons.length],
      approvedBy: appointingAuthorities[(index + 1 + companyIndex) % appointingAuthorities.length],
      finalSettlementStatus: index % 3 === 0 ? "Pending" : "Completed",
      location: locations[(index + companyIndex + 2) % locations.length],
      status: "Terminated",
      remarks: `Cessation of ${designation} disclosed in ${announcement.announcementSource} (${announcement.announcementId}).`,
      lifecycleType: "termination",
      ...announcement,
    };
  });
}

function buildRetirements(company, companyIndex) {
  return retirementDates.map((eventDate, index) => {
    const role = pickRole(index, companyIndex, 3);
    const leadershipFunction = functionByRole[role];
    const employeeName = retirementNames[(index + companyIndex) % retirementNames.length];
    const retirementDate = addDays(eventDate, companyIndex * 6);
    const ageAtRetirement = 59 + (index % 4);
    const roleCategory = roleCategoryByRole[role];
    const designation = getDesignation(role, index + 3);
    const announcement = buildAnnouncementMeta(
      company,
      retirementDate,
      designation,
      "RET",
      index,
      companyIndex,
    );

    return {
      id: `${company.id}-retirement-${index + 1}`,
      employeeId: getEmployeeId(company.id, "RET", index),
      employeeName,
      department: leadershipFunction,
      roleCategory,
      role,
      designation,
      dateOfJoining: addMonths(retirementDate, -260 - index * 4),
      retirementDate,
      ageAtRetirement,
      totalTenure: `${21 + index}y ${((index + companyIndex) % 11) + 1}m`,
      retirementType: index % 4 === 0 ? "Planned Executive Retirement" : "Superannuation",
      benefitsStatus: index % 2 === 0 ? "Processed" : "In Progress",
      knowledgeTransferStatus: index % 3 === 0 ? "Planned" : "Completed",
      replacementRequired: index % 2 === 0 ? "Yes" : "No",
      location: locations[(index + companyIndex + 3) % locations.length],
      reportingManager: appointingAuthorities[(index + companyIndex) % appointingAuthorities.length],
      status: "Retired",
      remarks: `Retirement of ${designation} notified through ${announcement.announcementSource}.`,
      lifecycleType: "retirement",
      ...announcement,
    };
  });
}

function buildUpcomingRetirements(company, companyIndex) {
  const dates = ["2026-05-19", "2026-06-28", "2026-08-14", "2026-11-07"];

  return dates.map((date, index) => {
    const role = pickRole(index, companyIndex, 4);
    const leadershipFunction = functionByRole[role];
    const employeeName = `${["Suresh", "Farah", "Bhaskar", "Renu"][index]} ${
      ["Kapoor", "D'Souza", "Prakash", "Mukherjee"][companyIndex % 4]
    }`;

    return {
      id: `${company.id}-upcoming-retirement-${index + 1}`,
      employeeId: getEmployeeId(company.id, "UPR", index),
      employeeName,
      department: leadershipFunction,
      roleCategory: roleCategoryByRole[role],
      role,
      designation: getDesignation(role, index),
      retirementDate: addDays(date, companyIndex * 9),
      location: locations[(index + companyIndex + 1) % locations.length],
    };
  });
}

function buildCompanyData(company, companyIndex) {
  return {
    ...company,
    appointments: buildAppointments(company, companyIndex),
    resignations: buildResignations(company, companyIndex),
    terminations: buildTerminations(company, companyIndex),
    retirements: buildRetirements(company, companyIndex),
    upcomingRetirements: buildUpcomingRetirements(company, companyIndex),
  };
}

export const companies = companyCatalog;

export const companyData = companyCatalog.reduce((accumulator, company, index) => {
  accumulator[company.id] = buildCompanyData(company, index);
  return accumulator;
}, {});
