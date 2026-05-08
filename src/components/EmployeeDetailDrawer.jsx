import { CalendarDays, ExternalLink, FileText, MapPin, X } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { buildEmployeeTimeline, formatDate, getInitials } from "../utils/dashboard";

const fieldGroups = {
  appointments: [
    ["Role", "role"],
    ["Function", "department"],
    ["Designation", "designation"],
    ["Effective Date", "dateOfJoining"],
    ["Type", "employmentType"],
    ["Authority", "reportingManager"],
    ["Location", "location"],
  ],
  terminations: [
    ["Role", "role"],
    ["Function", "department"],
    ["Designation", "designation"],
    ["Joining Date", "dateOfJoining"],
    ["Termination Date", "terminationDate"],
    ["Approved By", "approvedBy"],
    ["Settlement", "finalSettlementStatus"],
  ],
  resignations: [
    ["Role", "role"],
    ["Function", "department"],
    ["Designation", "designation"],
    ["Joining Date", "dateOfJoining"],
    ["Resignation Date", "resignationDate"],
    ["Manager", "reportingManager"],
    ["Location", "location"],
  ],
  retirements: [
    ["Role", "role"],
    ["Function", "department"],
    ["Designation", "designation"],
    ["Joining Date", "dateOfJoining"],
    ["Retirement Date", "retirementDate"],
    ["Benefits", "benefitsStatus"],
    ["Knowledge Transfer", "knowledgeTransferStatus"],
  ],
};

export default function EmployeeDetailDrawer({ isOpen, record, type, onClose }) {
  if (!isOpen || !record) return null;

  const timeline = buildEmployeeTimeline(record, type);
  const fields = fieldGroups[type];
  const lifecycleDate =
    type === "appointments"
      ? record.dateOfJoining
      : type === "terminations"
        ? record.terminationDate
        : type === "resignations"
          ? record.resignationDate
          : record.retirementDate;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-sm">
      <button
        aria-label="Close drawer"
        className="h-full flex-1 cursor-default"
        onClick={onClose}
        type="button"
      />
      <aside className="h-full w-full max-w-lg overflow-y-auto bg-white p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-base font-bold text-white">
              {getInitials(record.employeeName)}
            </div>
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                {record.employeeName}
              </h3>
              <p className="mt-0.5 text-sm text-slate-600">{record.designation}</p>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge value={record.status ?? "Active"} />
                <span className="text-xs text-slate-500">{record.employeeId}</span>
              </div>
            </div>
          </div>

          <button
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick stats */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Effective</p>
              <p className="text-sm font-semibold text-slate-900">{formatDate(lifecycleDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <MapPin className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Location</p>
              <p className="text-sm font-semibold text-slate-900">{record.location}</p>
            </div>
          </div>
        </div>

        {/* Source announcement */}
        {record.announcementDate && (
          <div className="mt-5 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-cool text-white">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Source</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{record.announcementHeadline}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {record.announcementSource} · {formatDate(record.announcementDate)} · {record.announcementId}
                  </p>
                </div>
              </div>
              {record.announcementUrl && (
                <a
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  href={record.announcementUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* KMP info */}
        <div className="mt-5">
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Details</h4>
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {fields.map(([label, key]) => (
              <div key={key}>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {label}
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                  {key.toLowerCase().includes("date") ? formatDate(record[key]) : record[key]}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Notes */}
        <div className="mt-5">
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Notes</h4>
          <p className="mt-2 text-sm leading-6 text-slate-700">{record.remarks}</p>
        </div>

        {/* Timeline */}
        <div className="mt-5 mb-2">
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Timeline</h4>
          <div className="mt-3 space-y-4">
            {timeline.map((event, index) => (
              <div key={`${event.label}-${event.date}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-2.5 w-2.5 rounded-full bg-gradient-brand" />
                  {index < timeline.length - 1 && (
                    <div className="mt-1.5 h-full w-px bg-slate-200" />
                  )}
                </div>
                <div className="pb-1">
                  <p className="text-sm font-semibold text-slate-900">{event.label}</p>
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                    {formatDate(event.date)}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600">{event.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
