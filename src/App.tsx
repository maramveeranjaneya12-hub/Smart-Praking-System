import { Menu, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { fetchDashboard } from './api/parkingApi';
import { CppInfoModal } from './components/CppInfoModal';
import { DashboardView } from './components/DashboardView';
import { HistoryReportsView } from './components/HistoryReportsView';
import { Sidebar } from './components/Sidebar';
import { SlotManagementView } from './components/SlotManagementView';
import { TicketManagementView } from './components/TicketManagementView';
import { VehicleEntryView } from './components/VehicleEntryView';
import { VehicleExitView } from './components/VehicleExitView';
import type { DashboardResponse, NavSection, VehicleType } from './types/parking';

const SECTION_LABELS: Record<NavSection, string> = {
  dashboard: 'Dashboard',
  entry: 'Vehicle Entry',
  exit: 'Vehicle Exit',
  slots: 'Parking Slots',
  tickets: 'Tickets',
  history: 'History & Reports',
};

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cppModalOpen, setCppModalOpen] = useState(false);

  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const [prefillVehicleType, setPrefillVehicleType] = useState<VehicleType>('Car');
  const [prefillTicketId, setPrefillTicketId] = useState('');

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const res = await fetchDashboard();
      if (!res.success) {
        setDashboardError(res.error ?? 'Failed to fetch dashboard data.');
      } else {
        setDashboardData(res);
      }
    } catch {
      setDashboardError('Unable to reach backend server.');
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, refreshSignal]);

  function triggerGlobalRefresh() {
    setRefreshSignal((prev) => prev + 1);
  }

  function handleNavigate(section: NavSection) {
    if (section !== 'exit') {
      setPrefillTicketId('');
    }
    setActiveSection(section);
  }

  function handleQuickEntry(vehicleType: VehicleType) {
    setPrefillVehicleType(vehicleType);
    setActiveSection('entry');
  }

  function handleQuickExit(ticketId: string) {
    setPrefillTicketId(ticketId);
    setActiveSection('exit');
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={handleNavigate}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenCppInfo={() => setCppModalOpen(true)}
      />

      <div className="lg:pl-64 flex min-h-screen flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-[#0F172A] lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="font-medium text-slate-500 hidden sm:inline">
                Smart Parking Management System
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-[#0F172A] truncate">
                {SECTION_LABELS[activeSection]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {dashboardData && (
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 tabular-nums">
                <span>
                  Cars:{' '}
                  <strong className="font-mono text-emerald-700">
                    {dashboardData.summary.availableCarSlots}/{dashboardData.summary.totalCarSlots}
                  </strong>
                </span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span>
                  Bikes:{' '}
                  <strong className="font-mono text-emerald-700">
                    {dashboardData.summary.availableBikeSlots}/{dashboardData.summary.totalBikeSlots}
                  </strong>
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={triggerGlobalRefresh}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${dashboardLoading ? 'animate-spin' : ''}`} />
              Sync
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {activeSection === 'dashboard' && (
              <DashboardView
                data={dashboardData}
                loading={dashboardLoading}
                error={dashboardError}
                onRefresh={triggerGlobalRefresh}
                onNavigate={handleNavigate}
                onQuickEntry={handleQuickEntry}
                onQuickExit={handleQuickExit}
              />
            )}

            {activeSection === 'entry' && (
              <VehicleEntryView
                defaultVehicleType={prefillVehicleType}
                summary={dashboardData?.summary ?? null}
                onEntrySuccess={triggerGlobalRefresh}
                onGoToExit={handleQuickExit}
                onGoToSlots={() => handleNavigate('slots')}
              />
            )}

            {activeSection === 'exit' && (
              <VehicleExitView
                initialTicketId={prefillTicketId}
                onExitSuccess={triggerGlobalRefresh}
              />
            )}

            {activeSection === 'slots' && (
              <SlotManagementView
                refreshSignal={refreshSignal}
                onSelectAvailableSlot={handleQuickEntry}
                onSelectOccupiedSlot={handleQuickExit}
              />
            )}

            {activeSection === 'tickets' && (
              <TicketManagementView
                refreshSignal={refreshSignal}
                onProcessExit={handleQuickExit}
              />
            )}

            {activeSection === 'history' && (
              <HistoryReportsView refreshSignal={refreshSignal} />
            )}
          </div>
        </main>
      </div>

      <CppInfoModal
        open={cppModalOpen}
        onClose={() => setCppModalOpen(false)}
        onResetComplete={triggerGlobalRefresh}
      />
    </div>
  );
}
