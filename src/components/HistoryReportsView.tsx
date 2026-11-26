import { Download, Printer, Receipt, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchHistory } from '../api/parkingApi';
import type { HistoryResponse, PaymentReceipt } from '../types/parking';

interface HistoryReportsViewProps {
  refreshSignal: number;
}

export function HistoryReportsView({ refreshSignal }: HistoryReportsViewProps) {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Car' | 'Bike'>('All');
  const [dateFilter, setDateFilter] = useState<string>('All');
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchHistory({
          q: query,
          type: typeFilter,
          date: dateFilter,
        });
        if (!cancelled) {
          if (!res.success) {
            setError(res.error ?? 'Failed to load parking history.');
          } else {
            setData(res);
          }
        }
      } catch {
        if (!cancelled) {
          setError('Unable to reach C++ backend for history reports.');
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
  }, [query, typeFilter, dateFilter, refreshSignal]);

  function handleExportCsv() {
    if (!data || data.records.length === 0) return;
    const headers = [
      'Payment ID',
      'Ticket ID',
      'Vehicle Number',
      'Vehicle Type',
      'Slot',
      'Entry Time',
      'Exit Time',
      'Duration',
      'Billed Hours',
      'Rate (INR/hr)',
      'Fee Collected (INR)',
    ];
    const rows = data.records.map((r) => [
      r.paymentId,
      r.ticketId,
      r.vehicleNumber,
      r.vehicleType,
      r.slotId,
      `"${r.entryTimeDisplay}"`,
      `"${r.exitTimeDisplay}"`,
      `"${r.durationFormatted}"`,
      r.billedHours,
      r.hourlyRate,
      r.amountPaid,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smart_parking_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleDownloadReceiptText(receipt: PaymentReceipt) {
    const blob = new Blob([receipt.receiptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${receipt.paymentId}_${receipt.ticketId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Parking History &amp; Financial Reports
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Completed transactions, daily revenue breakdown, and exportable parking payment records.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={!data || data.records.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0B192C] px-4 py-2 text-sm font-medium text-white hover:bg-[#13294B] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Report KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Parking Revenue</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#0F172A]">
            ₹{(data?.totals.allTimeRevenue ?? 0).toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Filtered view: ₹{(data?.totals.filteredRevenue ?? 0).toLocaleString('en-IN')}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Daily Revenue (Today)</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#1D4ED8]">
            ₹{(data?.totals.todayRevenue ?? 0).toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-slate-500">Collected in current calendar day</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Completed Transactions</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#0F172A]">
            {data?.totals.totalCompletedTransactions ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {data?.totals.carTransactions ?? 0} Cars · {data?.totals.bikeTransactions ?? 0} Bikes (filtered)
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Average Fee / Stay</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#0F172A]">
            ₹{Math.round(data?.totals.averageFee ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Avg stay: {Math.round(data?.totals.averageDurationMinutes ?? 0)} mins
          </p>
        </div>
      </div>

      {/* Daily Revenue Breakdown Chart + Table */}
      {data && data.dailyRevenue.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-[#0F172A]">Daily Revenue Trend</h2>
            <p className="text-xs text-slate-500">Total parking fees collected per day (₹)</p>
            <div className="mt-4 h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.dailyRevenue}
                  margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
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
                    formatter={(value: unknown) => [
                      `₹${Number(value).toLocaleString('en-IN')}`,
                      'Revenue',
                    ]}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E2E8F0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="totalRevenue"
                    fill="#1D4ED8"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={38}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="lg:col-span-5 rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-[#0F172A]">Daily Summary</h2>
              <p className="text-xs text-slate-500">Breakdown of exits and revenue by day</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                    <th className="px-5 py-2.5 font-medium">Date</th>
                    <th className="px-3 py-2.5 font-medium text-right">Cars</th>
                    <th className="px-3 py-2.5 font-medium text-right">Bikes</th>
                    <th className="px-5 py-2.5 font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...data.dailyRevenue].reverse().map((day) => (
                    <tr key={day.date} className="hover:bg-slate-50/70">
                      <td className="px-5 py-2.5 font-medium text-[#0F172A] tabular-nums">
                        {day.label}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-600">
                        {day.carCount}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-600">
                        {day.bikeCount}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono font-semibold tabular-nums text-[#0F172A]">
                        ₹{day.totalRevenue.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Vehicle Number, Ticket ID, or Receipt ID..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-[#0F172A] placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
                {type === 'All' ? 'All Vehicles' : type}
              </button>
            ))}
          </div>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            aria-label="Filter by date"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
          >
            <option value="All">All Dates</option>
            {(data?.availableDates ?? []).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Completed Transactions Table */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="px-6 py-3">Receipt / Ticket</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Slot</th>
                <th className="px-4 py-3">Entry Time</th>
                <th className="px-4 py-3">Exit Time</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3 text-right">Fee Collected</th>
                <th className="px-6 py-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && !data ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={8} className="px-6 py-4">
                      <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : (data?.records.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500">
                    No completed parking transactions match your selected filters.
                  </td>
                </tr>
              ) : (
                data!.records.map((rec) => (
                  <tr key={rec.paymentId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-mono text-xs font-semibold text-[#0F172A] tabular-nums">
                        {rec.paymentId}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500 tabular-nums">
                        {rec.ticketId}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-semibold text-slate-800">
                        {rec.vehicleNumber}
                      </p>
                      <p className="text-[11px] text-slate-500">{rec.vehicleType}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[#1D4ED8]">
                      {rec.slotId}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 tabular-nums">
                      {rec.entryTimeDisplay}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 tabular-nums">
                      {rec.exitTimeDisplay}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 tabular-nums">
                      {rec.durationFormatted}
                      <span className="block text-[11px] text-slate-400">
                        {rec.billedHours} {rec.billedHours === 1 ? 'hr' : 'hrs'} × ₹{rec.hourlyRate}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-semibold tabular-nums text-emerald-700">
                      ₹{rec.amountPaid}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(rec)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#1D4ED8] hover:text-[#1E40AF] hover:underline whitespace-nowrap"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Receipt Preview Modal */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B192C]/55 p-4"
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-semibold text-[#0F172A]">
                  Parking Receipt · {selectedReceipt.paymentId}
                </h2>
                <p className="text-xs text-slate-500">
                  {selectedReceipt.vehicleNumber} ({selectedReceipt.vehicleType}) · Slot {selectedReceipt.slotId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close receipt modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <pre className="overflow-x-auto rounded-lg bg-[#0B192C] p-4 font-mono text-xs leading-relaxed text-slate-100">
              {selectedReceipt.receiptText}
            </pre>

            <div className="flex justify-end gap-2.5 no-print">
              <button
                type="button"
                onClick={() => handleDownloadReceiptText(selectedReceipt)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-[#0F172A] hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Download .txt
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#1E40AF]"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
