const badgeStyles = {
  Appointed: "bg-emerald-100/70 text-emerald-700 ring-emerald-200/60",
  Active: "bg-emerald-100/70 text-emerald-700 ring-emerald-200/60",
  Pending: "bg-amber-100/70 text-amber-700 ring-amber-200/60",
  Completed: "bg-slate-100/70 text-slate-700 ring-slate-200/60",
  Resigned: "bg-amber-100/70 text-amber-700 ring-amber-200/60",
  Terminated: "bg-rose-100/70 text-rose-700 ring-rose-200/60",
  Retired: "bg-blue-100/70 text-blue-700 ring-blue-200/60",
  Scheduled: "bg-blue-100/70 text-blue-700 ring-blue-200/60",
  Served: "bg-slate-100/70 text-slate-700 ring-slate-200/60",
  Waived: "bg-amber-100/70 text-amber-700 ring-amber-200/60",
  Processed: "bg-slate-100/70 text-slate-700 ring-slate-200/60",
  "In Progress": "bg-blue-100/70 text-blue-700 ring-blue-200/60",
  Planned: "bg-amber-100/70 text-amber-700 ring-amber-200/60",
  Yes: "bg-rose-100/70 text-rose-700 ring-rose-200/60",
  No: "bg-emerald-100/70 text-emerald-700 ring-emerald-200/60",
};

export default function StatusBadge({ value }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 backdrop-blur ${
        badgeStyles[value] ?? "bg-slate-100/70 text-slate-700 ring-slate-200/60"
      }`}
    >
      {value}
    </span>
  );
}
