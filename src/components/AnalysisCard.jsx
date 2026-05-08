const toneAccent = {
  emerald: "bg-gradient-mint",
  amber: "bg-gradient-warm",
  blue: "bg-gradient-cool",
  teal: "bg-gradient-cool",
  slate: "bg-gradient-brand",
};

export default function AnalysisCard({ title, value, description, tone }) {
  const accent = toneAccent[tone] ?? toneAccent.slate;

  return (
    <div className="glass p-5">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-6 rounded-full ${accent}`} />
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      </div>
      <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">{value}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
