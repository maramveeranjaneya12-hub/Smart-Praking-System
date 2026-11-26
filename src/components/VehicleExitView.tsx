import {
  AlertCircle,
  CheckCircle2,
  Download,
  Printer,
  Receipt,
  Search,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { confirmExitApi, fetchTickets, previewExitApi } from '../api/parkingApi';
import type {
  ExitConfirmResponse,
  ExitPreviewResponse,
  ParkingTicket,
} from '../types/parking';

interface VehicleExitViewProps {
  initialTicketId: string;
  onExitSuccess: () => void;
}

export function VehicleExitView({ initialTicketId, onExitSuccess }: VehicleExitViewProps) {
  const [ticketInput, setTicketInput] = useState(initialTicketId);
  const [activeTickets, setActiveTickets] = useState<ParkingTicket[]>([]);
  const [searching, setSearching] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [preview, setPreview] = useState<ExitPreviewResponse | null>(null);
  const [receiptResult, setReceiptResult] = useState<ExitConfirmResponse | null>(null);

  async function loadActiveTickets() {
    try {
      const res = await fetchTickets({ status: 'Active' });
      if (res.success) {
        setActiveTickets(res.tickets);
      }
    } catch {
      // Non-blocking helper list
    }
  }

  useEffect(() => {
    loadActiveTickets();
  }, []);

  useEffect(() => {
    if (initialTicketId) {
      setTicketInput(initialTicketId);
      runSearch(initialTicketId);
    }
  }, [initialTicketId]);

  async function runSearch(idToSearch: string) {
    setSearching(true);
    setErrorMsg(null);
    setErrorCode(null);
    setReceiptResult(null);
    setPreview(null);

    try {
      const res = await previewExitApi(idToSearch);
      if (!res.success) {
        setErrorMsg(res.error ?? 'Ticket validation failed.');
        setErrorCode(res.errorCode ?? null);
      } else {
        setPreview(res);
      }
    } catch {
      setErrorMsg('Network error while validating ticket with C++ backend.');
    } finally {
      setSearching(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch(ticketInput);
  }

  async function handleConfirmExit() {
    if (!preview?.ticket) return;
    setConfirming(true);
    setErrorMsg(null);
    setErrorCode(null);

    try {
      const res = await confirmExitApi(preview.ticket.ticketId);
      if (!res.success) {
        setErrorMsg(res.error ?? 'Failed to complete vehicle exit.');
        setErrorCode(res.errorCode ?? null);
      } else {
        setReceiptResult(res);
        setPreview(null);
        setTicketInput('');
        onExitSuccess();
        loadActiveTickets();
      }
    } catch {
      setErrorMsg('Network error while confirming exit.');
    } finally {
      setConfirming(false);
    }
  }

  function handleDownloadReceipt() {
    if (!receiptResult?.receipt) return;
    const blob = new Blob([receiptResult.receipt.receiptText], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${receiptResult.receipt.paymentId}_${receiptResult.receipt.ticketId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
          Vehicle Exit &amp; Billing
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Validate a parking ticket, inspect the automatic hourly fee calculation, release the slot, and issue a receipt.
        </p>
      </div>

      {/* Ticket Search Card */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value.toUpperCase())}
              placeholder="Enter Ticket ID (e.g. TKT-1013)"
              maxLength={20}
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 font-mono text-sm uppercase text-[#0F172A] placeholder:normal-case placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E40AF] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
          >
            <Search className="h-4 w-4" />
            {searching ? 'Validating...' : 'Search Ticket'}
          </button>
        </form>

        {/* Active tickets quick-select */}
        {activeTickets.length > 0 && (
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-medium text-slate-500 mb-2">
              Currently Parked (click to populate Ticket ID):
            </p>
            <div className="flex flex-wrap gap-2">
              {activeTickets.slice(0, 8).map((tkt) => (
                <button
                  key={tkt.ticketId}
                  type="button"
                  onClick={() => {
                    setTicketInput(tkt.ticketId);
                    runSearch(tkt.ticketId);
                  }}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 hover:border-[#2563EB] hover:bg-blue-50/50 hover:text-[#1D4ED8] transition-colors whitespace-nowrap"
                >
                  <span className="font-mono font-semibold">{tkt.ticketId}</span>
                  <span className="text-slate-400">·</span>
                  <span className="font-mono">{tkt.vehicleNumber}</span>
                  <span className="text-slate-400">·</span>
                  <span>{tkt.slotId}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Validation Error Alert */}
        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold">
                {errorCode === 'DUPLICATE_TICKET_USAGE'
                  ? 'Duplicate Ticket Usage Rejected'
                  : 'Invalid Ticket ID'}
              </p>
              <p className="mt-0.5 text-xs text-red-700">{errorMsg}</p>
            </div>
          </div>
        )}
      </section>

      {/* Exit Fee Breakdown Preview */}
      {preview?.ticket && preview.feeBreakdown && (
        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-[#0F172A]">
                Checkout Summary · {preview.ticket.ticketId}
              </h2>
              <p className="text-xs text-slate-500">
                Verify duration and fee calculation before releasing slot {preview.ticket.slotId}.
              </p>
            </div>
            <span className="text-xs font-medium text-emerald-700">Valid Active Ticket</span>
          </div>

          <div className="grid grid-cols-1 gap-8 p-6 lg:grid-cols-12">
            {/* Vehicle & Timing details */}
            <div className="lg:col-span-6 space-y-4">
              <h3 className="text-sm font-semibold text-[#0F172A]">Vehicle &amp; Timing</h3>
              <dl className="divide-y divide-slate-100 text-sm">
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-slate-500">Vehicle Number</dt>
                  <dd className="font-mono font-semibold text-[#0F172A]">
                    {preview.ticket.vehicleNumber}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-slate-500">Vehicle Type</dt>
                  <dd className="font-medium text-[#0F172A]">{preview.ticket.vehicleType}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-slate-500">Allocated Parking Slot</dt>
                  <dd className="font-mono font-semibold text-[#1D4ED8]">
                    {preview.ticket.slotId}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-slate-500">Entry Time</dt>
                  <dd className="font-mono text-xs tabular-nums text-slate-800">
                    {preview.ticket.entryTimeDisplay}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-slate-500">Exit Time (Automatic)</dt>
                  <dd className="font-mono text-xs tabular-nums text-slate-800">
                    {preview.exitTimeDisplay}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-slate-500">Parking Duration</dt>
                  <dd className="font-mono text-xs font-semibold tabular-nums text-[#0F172A]">
                    {preview.feeBreakdown.durationFormatted}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Fee Breakdown */}
            <div className="lg:col-span-6 flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-5 space-y-5">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#0F172A]">Parking Fee Breakdown</h3>
                <dl className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-600">Fixed Hourly Rate ({preview.feeBreakdown.vehicleType})</dt>
                    <dd className="font-mono tabular-nums text-[#0F172A]">
                      ₹{preview.feeBreakdown.hourlyRate} / hr
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-600">Billed Hours</dt>
                    <dd className="font-mono tabular-nums text-[#0F172A]">
                      {preview.feeBreakdown.billedHours}{' '}
                      {preview.feeBreakdown.billedHours === 1 ? 'hour' : 'hours'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-600">Tariff Rule Applied</dt>
                    <dd className="text-xs text-slate-700 text-right">
                      {preview.feeBreakdown.billingRule}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-600">Calculation</dt>
                    <dd className="font-mono text-xs font-medium text-[#1D4ED8] tabular-nums">
                      {preview.feeBreakdown.billedHours} × ₹{preview.feeBreakdown.hourlyRate} = ₹
                      {preview.feeBreakdown.totalFee}
                    </dd>
                  </div>
                </dl>

                <div className="flex items-baseline justify-between border-t border-slate-200 pt-4">
                  <span className="text-sm font-semibold text-[#0F172A]">Total Parking Fee</span>
                  <span className="font-mono text-3xl font-bold tabular-nums text-[#0F172A]">
                    ₹{preview.feeBreakdown.totalFee}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={confirming}
                  onClick={handleConfirmExit}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E40AF] disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {confirming ? 'Processing Exit...' : 'Confirm Exit & Release Slot'}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Completed Parking Receipt */}
      {receiptResult?.receipt && (
        <section className="rounded-xl border border-emerald-200 bg-white overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200 bg-emerald-50/70 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              <div>
                <h2 className="text-base font-semibold text-emerald-950">
                  Exit Confirmed · Parking Receipt Generated
                </h2>
                <p className="text-xs text-emerald-800">{receiptResult.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 no-print">
              <button
                type="button"
                onClick={handleDownloadReceipt}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3.5 py-2 text-xs font-medium text-emerald-900 hover:bg-emerald-50 transition-colors whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" />
                Download Receipt
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B192C] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#13294B] transition-colors whitespace-nowrap"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
                <Receipt className="h-4 w-4 text-[#1D4ED8]" />
                <span>Payment Details</span>
              </div>
              <dl className="divide-y divide-slate-100 text-sm">
                <div className="flex justify-between py-2">
                  <dt className="text-slate-500">Receipt ID</dt>
                  <dd className="font-mono font-semibold text-[#0F172A]">
                    {receiptResult.receipt.paymentId}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-slate-500">Ticket ID</dt>
                  <dd className="font-mono font-medium text-slate-800">
                    {receiptResult.receipt.ticketId}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-slate-500">Vehicle</dt>
                  <dd className="font-mono font-semibold text-[#0F172A]">
                    {receiptResult.receipt.vehicleNumber} ({receiptResult.receipt.vehicleType})
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-slate-500">Released Slot</dt>
                  <dd className="font-mono font-semibold text-emerald-700">
                    {receiptResult.receipt.slotId} (Now Available)
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-slate-500">Entry Time</dt>
                  <dd className="font-mono text-xs tabular-nums text-slate-800">
                    {receiptResult.receipt.entryTimeDisplay}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-slate-500">Exit Time</dt>
                  <dd className="font-mono text-xs tabular-nums text-slate-800">
                    {receiptResult.receipt.exitTimeDisplay}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-slate-500">Duration / Billed Hours</dt>
                  <dd className="font-mono text-xs tabular-nums text-slate-800">
                    {receiptResult.receipt.durationFormatted} ({receiptResult.receipt.billedHours}{' '}
                    {receiptResult.receipt.billedHours === 1 ? 'hr' : 'hrs'} × ₹
                    {receiptResult.receipt.hourlyRate})
                  </dd>
                </div>
                <div className="flex justify-between py-3">
                  <dt className="font-semibold text-[#0F172A]">Amount Collected</dt>
                  <dd className="font-mono text-xl font-bold tabular-nums text-emerald-700">
                    ₹{receiptResult.receipt.amountPaid}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="lg:col-span-5">
              <p className="mb-2 text-xs font-medium text-slate-500">
                C++ Generated Receipt Output
              </p>
              <pre className="overflow-x-auto rounded-lg bg-[#0B192C] p-4 font-mono text-[11px] leading-relaxed text-slate-100">
                {receiptResult.receipt.receiptText}
              </pre>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
