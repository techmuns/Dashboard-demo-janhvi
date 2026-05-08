import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatCompactNumber } from "../utils/dashboard";

const colorStyles = {
  blue: "bg-gradient-cool",
  emerald: "bg-gradient-mint",
  amber: "bg-gradient-warm",
  rose: "bg-gradient-warm",
  teal: "bg-gradient-cool",
  slate: "bg-gradient-brand",
};

function isPositiveDelta(comparison) {
  if (!comparison) return null;
  if (/^\+/.test(comparison)) return true;
  if (/^-/.test(comparison)) return false;
  return null;
}

export default function KPICard({ icon: Icon, label, value, comparison, color }) {
  const displayValue = typeof value === "number" ? formatCompactNumber(value) : value;
  const iconBg = colorStyles[color] ?? colorStyles.slate;
  const positive = isPositiveDelta(comparison);

  return (
    <div className="glass p-5 transition hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
        {comparison && positive !== null && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {comparison.split(" ")[0]}
          </span>
        )}
      </div>
      <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-900">{displayValue}</p>
      <p className="mt-1 text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}
