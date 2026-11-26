import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchTickets } from '../api/parkingApi';
import type { ParkingTicket, TicketsResponse } from '../types/parking';

interface TicketManagementViewProps {
  refreshSignal: number;
  onProcessExit: (ticketId: string) => void;
}

export function TicketManagementView({
  refreshSignal,
  onProcessExit,
}: TicketManagementViewProps) {
  const [data, setData] = useState<TicketsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Completed'>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Car' | 'Bike'>('All');
  const [selectedTicket, setSelectedTicket] = useState<ParkingTicket | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchTickets({
          q: query,
          status: statusFilter,
          type: typeFilter,
        });
        if (!cancelled) {
          if (!res.success) {
            setError(res.error ?? 'Failed to load tickets.');
          } else {
            setData(res);
          }
        }
      } catch {
        if (!cancelled) {
          setError('Unable to reach C++ backend for tickets.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const timer = window.setTimeout(load, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, statusFilter, typeFilter, refreshSignal]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Ticket Management</h1>
          <p className="mt-1 text-sm text-slate-600">
            Search active and completed parking tickets by Ticket ID or Vehicle Number.
          </p>
        </div>
        {data && (
          <div className="flex items-center gap-3 text-xs text-slate-600 tabular-nums">
            <span>Total: {data.counts.total}</span>
            <span className="text-slate-300">·</span>
            <span className="font-medium text-emerald-700">Active: {data.counts.active}</span>
            <span className="text-slate-300">·</span>
            <span>Completed: {data.counts.completed}</span>
          </div>
        )}
      </div>

      {/* Search & Segmented Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Ticket ID (TKT-1013) or Vehicle Number..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-[#0F172A] placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(['All', 'Active', 'Completed'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(['All', 'Car', 'Bike'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter(type)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  typeFilter === type
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                {type === 'All' ? 'All Types' : type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Tickets Table */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="px-6 py-3">Ticket ID</th>
                <th className="px-4 py-3">Vehicle Number</th>
                <th className="px-4 py-3">Vehicle Type</th>
                <th className="px-4 py-3">Allocated Slot</th>
                <th className="px-4 py-3">Entry Date &amp; Time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Fee</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && !data ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={8} className="px-6 py-4">
                      <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : (data?.tickets.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500">
                    No parking tickets found matching your search criteria.
                  </td>
                </tr>
              ) : (
                data!.tickets.map((tkt) => (
                  <tr key={tkt.ticketId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs font-semibold text-[#0F172A] tabular-nums">
                      {tkt.ticketId}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-800">
                      {tkt.vehicleNumber}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{tkt.vehicleType}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[#1D4ED8]">
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
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedTicket(tkt)}
                          className="text-xs font-medium text-slate-600 hover:text-[#0F172A] whitespace-nowrap"
                        >
                          Details
                        </button>
                        {tkt.status === 'Active' && (
                          <button
                            type="button"
                            onClick={() => onProcessExit(tkt.ticketId)}
                            className="text-xs font-medium text-[#1D4ED8] hover:text-[#1E40AF] hover:underline whitespace-nowrap"
                          >
                            Exit Vehicle
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B192C]/50 p-4"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-base font-semibold text-[#0F172A]">
                  Ticket {selectedTicket.ticketId}
                </h2>
                <p className="text-xs text-slate-500">
                  Status: {selectedTicket.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close ticket details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <dl className="mt-4 divide-y divide-slate-100 text-sm">
              <div className="flex justify-between py-2.5">
                <dt className="text-slate-500">Vehicle Number</dt>
                <dd className="font-mono font-semibold text-[#0F172A]">
                  {selectedTicket.vehicleNumber}
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-slate-500">Vehicle Type</dt>
                <dd className="font-medium text-[#0F172A]">{selectedTicket.vehicleType}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-slate-500">Allocated Slot</dt>
                <dd className="font-mono font-semibold text-[#1D4ED8]">
                  {selectedTicket.slotId}
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-slate-500">Entry Time</dt>
                <dd className="font-mono text-xs tabular-nums text-slate-800">
                  {selectedTicket.entryTimeDisplay}
                </dd>
              </div>
              {selectedTicket.status === 'Completed' && (
                <>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-slate-500">Exit Time</dt>
                    <dd className="font-mono text-xs tabular-nums text-slate-800">
                      {selectedTicket.exitTimeDisplay}
                    </dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-slate-500">Parking Duration</dt>
                    <dd className="font-mono text-xs tabular-nums text-slate-800">
                      {selectedTicket.durationFormatted} ({selectedTicket.billedHours} hrs billed)
                    </dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-slate-500">Fee Collected</dt>
                    <dd className="font-mono font-semibold text-emerald-700 tabular-nums">
                      ₹{selectedTicket.feeAmount}
                    </dd>
                  </div>
                </>
              )}
            </dl>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              {selectedTicket.status === 'Active' && (
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedTicket.ticketId;
                    setSelectedTicket(null);
                    onProcessExit(id);
                  }}
                  className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E40AF]"
                >
                  Proceed to Exit
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
