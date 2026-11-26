import {
  BarChart3,
  Bike,
  Car,
  Code2,
  Grid2x2,
  LayoutDashboard,
  LogIn,
  LogOut,
  Ticket,
  X,
} from 'lucide-react';
import type { NavSection } from '../types/parking';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenCppInfo: () => void;
}

const NAV_ITEMS: { id: NavSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'entry', label: 'Vehicle Entry', icon: LogIn },
  { id: 'exit', label: 'Vehicle Exit', icon: LogOut },
  { id: 'slots', label: 'Parking Slots', icon: Grid2x2 },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'history', label: 'History & Reports', icon: BarChart3 },
];

export function Sidebar({
  activeSection,
  onSelectSection,
  mobileOpen,
  onCloseMobile,
  onOpenCppInfo,
}: SidebarProps) {
  const navContent = (
    <div className="flex h-full flex-col bg-[#0B192C] text-slate-100">
      {/* Brand header */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB] text-white font-bold text-sm">
            P
          </div>
          <span className="font-semibold tracking-tight text-white text-[15px] whitespace-nowrap">
            SmartPark
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Primary navigation */}
      <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectSection(item.id);
                onCloseMobile();
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#2563EB] text-white'
                  : 'text-slate-300 hover:bg-white/8 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Fixed tariff summary */}
      <div className="border-t border-white/10 px-5 py-4 space-y-3">
        <p className="text-xs font-medium text-slate-400">Standard Hourly Tariff</p>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-200">
            <span className="flex items-center gap-2">
              <Car className="h-3.5 w-3.5 text-blue-400" />
              Car
            </span>
            <span className="font-mono tabular-nums font-medium text-white">₹40 / hr</span>
          </div>
          <div className="flex items-center justify-between text-slate-200">
            <span className="flex items-center gap-2">
              <Bike className="h-3.5 w-3.5 text-sky-400" />
              Bike
            </span>
            <span className="font-mono tabular-nums font-medium text-white">₹20 / hr</span>
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Minimum 1 hour charge. Partial hours rounded up.
        </p>
      </div>

      {/* C++ backend info button */}
      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={() => {
            onOpenCppInfo();
            onCloseMobile();
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/8 hover:text-white transition-colors whitespace-nowrap"
        >
          <Code2 className="h-4 w-4 text-blue-400 shrink-0" />
          <span>C++ Backend & Storage</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-64 no-print">
        {navContent}
      </aside>

      {/* Mobile slide-over sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden no-print">
          <div
            className="fixed inset-0 bg-[#0B192C]/60 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[82vw]">{navContent}</aside>
        </div>
      )}
    </>
  );
}
