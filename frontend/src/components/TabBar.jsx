import { Hash, Clock, Users, UserPlus } from "lucide-react";

const TABS = [
  { id: "checkin", label: "Check-In", icon: Hash },
  { id: "lapsed", label: "Lapsed", icon: Clock },
  { id: "members", label: "Members", icon: Users },
  { id: "new", label: "+ New", icon: UserPlus },
];

// Persistent, always visible, four destinations one tap away — no hamburger
// menu, no nested navigation (app-flow.md §1, DESIGN.md "One-Tap-Away Rule").
export default function TabBar({ active, onChange }) {
  return (
    <nav className="flex h-16 shrink-0 border-t border-steel-300 bg-chalk-50">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={isActive ? "page" : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-1 border-t-2 font-body text-xs ${
              isActive
                ? "border-signal-yellow font-semibold text-ink-900"
                : "border-transparent text-steel-700"
            }`}
          >
            <Icon size={22} strokeWidth={1.75} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
