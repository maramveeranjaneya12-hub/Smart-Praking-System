import {
  ArrowRight,
  Bike,
  Car,
  IndianRupee,
  LogIn,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardResponse, NavSection, VehicleType } from '../types/parking';

interface DashboardViewProps {
  data: DashboardResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onNavigate: (section: NavSection) => void;
  onQuickEntry: (type: VehicleType) => void;
  onQuickExit: (ticketId: string) => void;
}

export function DashboardView({
  data,
  loading,
  error,
  onRefresh,
  onNavigate,
  onQuickEntry,
  onQuickExit,
}: DashboardViewProps) {
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white p-5"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white p-6" />
          <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white p-6" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-base font-semibold text-red-900">Unable to load dashboard</h2>
        <p className="mt-1 text-sm text-red-700">{error ?? 'No response from C++ backend.'}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E40AF] transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  const { summary, dailyRevenue, recentActivity } = data;

  const carOccupancyPct =
    summary.totalCarSlots > 0
      ? Math.round((summary.occupiedCarSlots / summary.totalCarSlots) * 100)
      : 0;
  const bikeOccupancyPct =
    summary.totalBikeSlots > 0
      ? Math.round((summary.occupiedBikeSlots / summary.totalBikeSlots) * 100)
      : 0;

  const occupancyChartData = [
    {
      category: 'Cars',
      Available: summary.availableCarSlots,
      Occupied: summary.occupiedCarSlots,
    },
    {
      category: 'Bikes',
      Available: summary.availableBikeSlots,
      Occupied: summary.occupiedBikeSlots,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Parking Operations Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Real-time car and bike bay availability, active vehicles, and revenue summary.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onQuickEntry('Car')}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E40AF] transition-colors whitespace-nowrap shrink-0"
          >
            <LogIn className="h-4 w-4" />
            New Vehicle Entry
          </button>
          <button
            type="button"
            onClick={() => onNavigate('exit')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="h-4 w-4" />
            Process Exit
          </button>
        </div>
      </div>

      {/* Primary KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Currently Parked Vehicles</span>
            <Car className="h-4 w-4 text-[#1D4ED8]" />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold tabular-nums text-[#0F172A]">
            {summary.currentlyParkedVehicles}
          </p>
          <p className="mt-2 text-xs text-slate-500 tabular-nums">
            {summary.occupiedCarSlots} Cars · {summary.occupiedBikeSlots} Bikes · {summary.availableSlots} free bays
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Total Parking Revenue</span>
            <IndianRupee className="h-4 w-4 text-[#1D4ED8]" />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold tabular-nums text-[#0F172A]">
            ₹{summary.totalRevenue.toLocaleString('en-IN')}
          </p>
          <p className="mt-2 text-xs text-slate-500 tabular-nums">
            Today: ₹{summary.todayRevenue.toLocaleString('en-IN')} · {summary.totalCompletedTransactions} completed exits
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Car Parking Capacity</span>
            <Car className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold tabular-nums text-emerald-700">
              {summary.availableCarSlots}
            </span>
            <span className="text-sm text-slate-500 tabular-nums">
              available of {summary.totalCarSlots}
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#1D4ED8] transition-all duration-300"
              style={{ width: `${carOccupancyPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {summary.occupiedCarSlots} occupied ({carOccupancyPct}%)
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Bike Parking Capacity</span>
            <Bike className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold tabular-nums text-emerald-700">
              {summary.availableBikeSlots}
            </span>
            <span className="text-sm text-slate-500 tabular-nums">
              available of {summary.totalBikeSlots}
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#0B192C] transition-all duration-300"
              style={{ width: `${bikeOccupancyPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {summary.occupiedBikeSlots} occupied ({bikeOccupancyPct}%)
          </p>
        </div>
      </div>

      {/* Explicit 6-metric Slot Breakdown Bar */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-2 divide-y divide-slate-200 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-y-0">
          <div className="p-4">
            <p className="text-xs font-medium text-slate-500">Total Car Slots</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#0F172A]">
              {summary.totalCarSlots}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-slate-500">Available Car Slots</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-emerald-700">
              {summary.availableCarSlots}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-slate-500">Occupied Car Slots</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-red-700">
              {summary.occupiedCarSlots}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-slate-500">Total Bike Slots</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#0F172A]">
              {summary.totalBikeSlots}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-slate-500">Available Bike Slots</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-emerald-700">
              {summary.availableBikeSlots}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-slate-500">Occupied Bike Slots</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-red-700">
              {summary.occupiedBikeSlots}
            </p>
          </div>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Occupancy Chart */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#0F172A]">
                Parking Slot Occupancy
              </h2>
              <p className="text-xs text-slate-500">
                Available vs occupied slots across Car and Bike zones
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('slots')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#1D4ED8] hover:text-[#1E40AF] whitespace-nowrap"
            >
              View Slot Map
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-5 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={occupancyChartData}
                margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                barGap={8}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="category"
                  tick={{ fill: '#475569', fontSize: 12 }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#475569', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="Available" fill="#16A34A" radius={[4, 4, 0, 0]} maxBarSize={52} />
                <Bar dataKey="Occupied" fill="#DC2626" radius={[4, 4, 0, 0]} maxBarSize={52} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Daily Revenue Chart */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#0F172A]">
                Daily Parking Revenue (₹)
              </h2>
              <p className="text-xs text-slate-500">
                Revenue collected from Cars (₹40/hr) and Bikes (₹20/hr) over the last 7 days
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#1D4ED8] hover:text-[#1E40AF] whitespace-nowrap"
            >
              Full Reports
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-5 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyRevenue}
                margin={{ top: 8, right: 12, left: -4, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#475569', fontSize: 12 }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v}`}
                />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [
                    `₹${Number(value).toLocaleString('en-IN')}`,
                    name === 'carRevenue' ? 'Car Revenue' : 'Bike Revenue',
                  ]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  formatter={(value) => (value === 'carRevenue' ? 'Car Revenue' : 'Bike Revenue')}
                  wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                />
                <Bar
                  dataKey="carRevenue"
                  stackId="rev"
                  fill="#1D4ED8"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={36}
                />
                <Bar
                  dataKey="bikeRevenue"
                  stackId="rev"
                  fill="#0B192C"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Recent Parking Activity */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[#0F172A]">Recent Parking Activity</h2>
            <p className="text-xs text-slate-500">
              Latest vehicle entries and completed exits stored by the C++ backend
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('tickets')}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#1D4ED8] hover:text-[#1E40AF] whitespace-nowrap"
          >
            View All Tickets
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="px-6 py-3">Ticket ID</th>
                <th className="px-4 py-3">Vehicle Number</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Slot</th>
                <th className="px-4 py-3">Entry Time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Fee</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-500">
                    No parking records yet. Park your first vehicle to begin tracking activity.
                  </td>
                </tr>
              ) : (
                recentActivity.map((tkt) => (
                  <tr key={tkt.ticketId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs font-semibold text-[#0F172A] tabular-nums">
                      {tkt.ticketId}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-800">
                      {tkt.vehicleNumber}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{tkt.vehicleType}</td>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-[#1D4ED8]">
                      {tkt.slotId}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 tabular-nums">
                      {tkt.entryTimeDisplay}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium">
                      <span
                        className={
                          tkt.status === 'Active' ? 'text-emerald-700' : 'text-slate-500'
                        }
                      >
                        {tkt.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-slate-800">
                      {tkt.status === 'Completed' ? `₹${tkt.feeAmount}` : '—'}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {tkt.status === 'Active' ? (
                        <button
                          type="button"
                          onClick={() => onQuickExit(tkt.ticketId)}
                          className="text-xs font-medium text-[#1D4ED8] hover:text-[#1E40AF] hover:underline whitespace-nowrap"
                        >
                          Checkout
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Closed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
