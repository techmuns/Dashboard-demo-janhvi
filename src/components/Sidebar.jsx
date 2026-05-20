import {
  Activity,
  BarChart3,
  Building2,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";

export const navigation = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "tracker", label: "KMP Tracker", icon: Activity },
  { key: "companies", label: "Companies", icon: Building2 },
  { key: "sources", label: "Sources / Audit", icon: ShieldCheck },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
];

export default function Sidebar({ activeView, onNavigate }) {
  return (
    <aside className="surface hidden w-64 shrink-0 flex-col p-4 lg:flex">
      <div className="glass-dark flex h-full flex-col p-5 text-white">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-base font-bold text-white">
            M
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/50">Munshot</p>
            <h2 className="text-base font-semibold tracking-tight">KMP Intelligence</h2>
          </div>
        </div>

        {/* Nav */}
        <nav className="mt-8 flex-1 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.key;
            return (
              <button
                key={item.label}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  isActive
                    ? "bg-white/15 font-semibold text-white"
                    : "font-medium text-white/70 hover:bg-white/10 hover:text-white"
                }`}
                onClick={() => onNavigate(item.key)}
                type="button"
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
