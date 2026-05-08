import { useDeferredValue, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MoreHorizontal,
  Search,
} from "lucide-react";
import {
  KMP_ROLE_META,
  KMP_ROLE_ORDER,
  formatDate,
  getRelevantDateField,
  parseDate,
} from "../utils/dashboard";

const sharedColumns = [
  { key: "serialNo", label: "Serial No" },
  { key: "personRole", label: "Person & Role" },
  { key: "changeType", label: "Change Type" },
  { key: "effectiveImpact", label: "Effective Date & Why It Matters" },
  { key: "sourceName", label: "Source Name" },
  { key: "sourceDate", label: "Source Date", date: true },
];

const columnsByType = {
  appointments: sharedColumns,
  terminations: sharedColumns,
  resignations: sharedColumns,
  retirements: sharedColumns,
};

const changeTypeMeta = {
  appointments: {
    label: "Appointment",
    chip: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  },
  resignations: {
    label: "Resignation",
    chip: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  },
  terminations: {
    label: "Termination",
    chip: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
  },
  retirements: {
    label: "Retirement",
    chip: "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
  },
};

function getEffectiveDateField(type) {
  return {
    appointments: "dateOfJoining",
    resignations: "resignationDate",
    terminations: "terminationDate",
    retirements: "retirementDate",
  }[type];
}

function getWhyItMatters(type, record) {
  const fn = record.department || "the leadership team";
  if (type === "appointments") {
    return `Adds new ${record.role} capacity to ${fn}; signals fresh strategic direction.`;
  }
  if (type === "resignations") {
    return `Creates a ${record.role} leadership gap in ${fn}; succession planning needed.`;
  }
  if (type === "terminations") {
    return `Board-driven ${record.role} exit; governance and continuity risk in ${fn}.`;
  }
  if (type === "retirements") {
    const tenure = record.totalTenure ? ` after ${record.totalTenure}` : "";
    return `Planned ${record.role} succession in ${fn}${tenure}; institutional knowledge transition.`;
  }
  return "Material leadership change.";
}

const roleChip = {
  blue: "bg-blue-50 text-blue-700",
  emerald: "bg-emerald-50 text-emerald-700",
  teal: "bg-teal-50 text-teal-700",
  indigo: "bg-indigo-50 text-indigo-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  slate: "bg-slate-100 text-slate-700",
  violet: "bg-violet-50 text-violet-700",
};

const pageSize = 8;

function RoleChip({ role }) {
  const meta = KMP_ROLE_META[role];
  const tone = meta?.tone ?? "slate";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleChip[tone]}`}>
      {meta?.label ?? role ?? "—"}
    </span>
  );
}

export default function EmployeeTable({ type, records, onViewDetails, title, subtitle }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);
  const deferredSearch = useDeferredValue(searchTerm);

  const columns = columnsByType[type];
  const relevantField = getRelevantDateField(type);

  const presentRoles = useMemo(() => {
    const roles = new Set(records.map((record) => record.role).filter(Boolean));
    return KMP_ROLE_ORDER.filter((role) => roles.has(role));
  }, [records]);

  const filteredRecords = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return records
      .filter((record) => {
        const matchesSearch =
          !query ||
          record.employeeName.toLowerCase().includes(query) ||
          record.designation.toLowerCase().includes(query);
        const matchesRole = roleFilter === "All" || record.role === roleFilter;
        return matchesSearch && matchesRole;
      })
      .sort((a, b) => parseDate(b[relevantField]) - parseDate(a[relevantField]));
  }, [records, deferredSearch, roleFilter, relevantField]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  function setFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  function renderCell(record, column, rowIndex) {
    if (column.key === "serialNo") {
      const serial = (currentPage - 1) * pageSize + rowIndex + 1;
      return (
        <span className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-full bg-white/70 px-2 text-xs font-semibold text-slate-700 ring-1 ring-white">
          {String(serial).padStart(2, "0")}
        </span>
      );
    }

    if (column.key === "personRole") {
      return (
        <div className="flex flex-col gap-1.5">
          <div>
            <p className="font-semibold text-slate-900">{record.employeeName}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {record.designation} · {record.employeeId}
            </p>
          </div>
          <div>
            <RoleChip role={record.role} />
          </div>
        </div>
      );
    }

    if (column.key === "changeType") {
      const meta = changeTypeMeta[type];
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${meta.chip}`}>
          {meta.label}
        </span>
      );
    }

    if (column.key === "effectiveImpact") {
      const field = getEffectiveDateField(type);
      return (
        <div className="max-w-md">
          <p className="text-sm font-semibold text-slate-900">{formatDate(record[field])}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{getWhyItMatters(type, record)}</p>
        </div>
      );
    }

    if (column.key === "sourceName") {
      return (
        <a
          href={record.announcementUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900"
        >
          {record.announcementSource}
          <ExternalLink className="h-3 w-3 opacity-60" />
        </a>
      );
    }

    if (column.key === "sourceDate") {
      return <span className="text-slate-700">{formatDate(record.announcementDate)}</span>;
    }

    if (column.date) return <span className="text-slate-700">{formatDate(record[column.key])}</span>;

    return record[column.key];
  }

  return (
    <div className="glass overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-white/60 px-6 py-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <span className="text-xs font-medium text-slate-500">
          {filteredRecords.length} {filteredRecords.length === 1 ? "record" : "records"}
        </span>
      </div>

      {/* Search + Role chips */}
      <div className="flex flex-col gap-3 border-b border-white/60 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <label className="field-glass max-w-md flex-1">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400"
            placeholder="Search by name or designation"
            value={searchTerm}
            onChange={(event) => setFilter(setSearchTerm, event.target.value)}
          />
        </label>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter(setRoleFilter, "All")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              roleFilter === "All"
                ? "bg-slate-900 text-white"
                : "bg-white/60 text-slate-600 hover:bg-white"
            }`}
          >
            All
          </button>
          {presentRoles.map((role) => {
            const meta = KMP_ROLE_META[role];
            const isActive = roleFilter === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setFilter(setRoleFilter, role)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : `${roleChip[meta?.tone ?? "slate"]} hover:brightness-95`
                }`}
              >
                {meta?.label ?? role}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {filteredRecords.length ? (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-white/40">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                    >
                      {column.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500" />
                </tr>
              </thead>
              <tbody>
                {paginated.map((record, rowIndex) => (
                  <tr
                    key={record.id}
                    className="border-t border-white/60 transition hover:bg-white/55"
                  >
                    {columns.map((column) => (
                      <td key={column.key} className="table-cell align-top">
                        {renderCell(record, column, rowIndex)}
                      </td>
                    ))}
                    <td className="table-cell w-12 text-right">
                      <div className="relative inline-block">
                        <button
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-white"
                          onClick={() => setOpenMenuId(openMenuId === record.id ? null : record.id)}
                          type="button"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {openMenuId === record.id && (
                          <div className="glass-sm absolute right-0 top-[calc(100%+0.4rem)] z-20 w-44 overflow-hidden p-1.5">
                            <button
                              className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-white/80"
                              onClick={() => {
                                onViewDetails(record, type);
                                setOpenMenuId(null);
                              }}
                              type="button"
                            >
                              View details
                            </button>
                            <a
                              className="block rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-white/80"
                              href={record.announcementUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => setOpenMenuId(null)}
                            >
                              Open announcement
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-white/60 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-slate-500">
              {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length}
            </p>

            <div className="flex items-center gap-1.5">
              <button
                className="inline-flex items-center gap-1 rounded-lg border border-white/70 bg-white/60 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                type="button"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <span className="px-2 text-xs font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                className="inline-flex items-center gap-1 rounded-lg border border-white/70 bg-white/60 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                disabled={currentPage === totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                type="button"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="px-6 py-12 text-center">
          <h3 className="text-base font-semibold text-slate-800">No records found</h3>
          <p className="mt-1 text-sm text-slate-500">Try clearing the search or selecting a different role.</p>
        </div>
      )}
    </div>
  );
}
