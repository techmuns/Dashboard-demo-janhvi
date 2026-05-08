export default function AnalyticsChart({ title, subtitle, children, className = "" }) {
  return (
    <div className={`glass p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="text-base font-semibold tracking-tight text-slate-900">{title}</h3>
        <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
