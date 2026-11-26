import {
  AlertCircle,
  ArrowRight,
  Bike,
  Car,
  CheckCircle2,
  Clock,
  Printer,
  Ticket,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { parkVehicleApi } from '../api/parkingApi';
import type { DashboardSummary, EntryResponse, VehicleType } from '../types/parking';

interface VehicleEntryViewProps {
  defaultVehicleType: VehicleType;
  summary: DashboardSummary | null;
  onEntrySuccess: () => void;
  onGoToExit: (ticketId: string) => void;
  onGoToSlots: () => void;
}

export function VehicleEntryView({
  defaultVehicleType,
  summary,
  onEntrySuccess,
  onGoToExit,
  onGoToSlots,
}: VehicleEntryViewProps) {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>(defaultVehicleType);
  const [nowDisplay, setNowDisplay] = useState(() =>
    new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [allocatedResult, setAllocatedResult] = useState<EntryResponse | null>(null);

  useEffect(() => {
    setVehicleType(defaultVehicleType);
  }, [defaultVehicleType]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowDisplay(
        new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const carAvailable = summary?.availableCarSlots ?? 0;
  const carTotal = summary?.totalCarSlots ?? 20;
  const bikeAvailable = summary?.availableBikeSlots ?? 0;
  const bikeTotal = summary?.totalBikeSlots ?? 16;

  const selectedAvailable = vehicleType === 'Car' ? carAvailable : bikeAvailable;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setErrorCode(null);
    setSubmitting(true);

    try {
      const response = await parkVehicleApi(vehicleNumber, vehicleType);
      if (!response.success) {
        setErrorMessage(response.error ?? 'Failed to allocate parking slot.');
        setErrorCode(response.errorCode ?? null);
        setAllocatedResult(null);
      } else {
        setAllocatedResult(response);
        setVehicleNumber('');
        onEntrySuccess();
      }
    } catch {
      setErrorMessage('Network error while communicating with C++ backend.');
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrintTicket() {
    if (!allocatedResult?.ticket) return;
    window.print();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Vehicle Entry</h1>
        <p className="mt-1 text-sm text-slate-600">
          Register an incoming vehicle to automatically allocate the first available bay and issue a ticket.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Entry Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 space-y-6"
        >
          <div>
            <h2 className="text-base font-semibold text-[#0F172A]">Vehicle Details</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Entry date and time are recorded automatically by the C++ backend.
            </p>
          </div>

          {/* Error alert */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <div>
                <p className="font-semibold">
                  {errorCode === 'PARKING_FULL'
                    ? 'Parking Full'
                    : errorCode === 'DUPLICATE_ACTIVE_VEHICLE'
                    ? 'Duplicate Active Parking'
                    : 'Allocation Error'}
                </p>
                <p className="mt-0.5 text-xs text-red-700">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Vehicle Number */}
          <div className="space-y-2">
            <label
              htmlFor="vehicle-number"
              className="block text-sm font-medium text-[#0F172A]"
            >
              Vehicle Registration Number
            </label>
            <input
              id="vehicle-number"
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              placeholder="e.g. MH-12-XY-4820"
              maxLength={24}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-mono text-sm uppercase tracking-wide text-[#0F172A] placeholder:text-slate-400 placeholder:normal-case focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
            />
            <p className="text-xs text-slate-500">
              Enter registration plate (4–20 characters). Duplicate active entries are automatically blocked.
            </p>
          </div>

          {/* Vehicle Type Selection */}
          <div className="space-y-2">
            <span className="block text-sm font-medium text-[#0F172A]">Vehicle Type</span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setVehicleType('Car')}
                className={`flex items-start justify-between rounded-lg border p-4 text-left transition-colors ${
                  vehicleType === 'Car'
                    ? 'border-[#2563EB] bg-blue-50/60 ring-1 ring-[#2563EB]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-sm text-[#0F172A]">
                    <Car className="h-4 w-4 text-[#1D4ED8]" />
                    <span>Car</span>
                  </div>
                  <p className="font-mono text-xs text-slate-600 tabular-nums">₹40 / hour</p>
                  <p
                    className={`text-xs font-medium tabular-nums ${
                      carAvailable > 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {carAvailable > 0
                      ? `${carAvailable} of ${carTotal} slots available`
                      : 'Parking Full'}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setVehicleType('Bike')}
                className={`flex items-start justify-between rounded-lg border p-4 text-left transition-colors ${
                  vehicleType === 'Bike'
                    ? 'border-[#2563EB] bg-blue-50/60 ring-1 ring-[#2563EB]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-sm text-[#0F172A]">
                    <Bike className="h-4 w-4 text-[#1D4ED8]" />
                    <span>Bike</span>
                  </div>
                  <p className="font-mono text-xs text-slate-600 tabular-nums">₹20 / hour</p>
                  <p
                    className={`text-xs font-medium tabular-nums ${
                      bikeAvailable > 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {bikeAvailable > 0
                      ? `${bikeAvailable} of ${bikeTotal} slots available`
                      : 'Parking Full'}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Automatic Entry Timestamp */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#0F172A]">
              Entry Date &amp; Time (Automatic)
            </label>
            <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
              <Clock className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="font-mono text-xs tabular-nums">{nowDisplay}</span>
            </div>
          </div>

          {/* Submit */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              {selectedAvailable > 0
                ? `Next available ${vehicleType.toLowerCase()} slot will be assigned automatically.`
                : `All ${vehicleType.toLowerCase()} slots are currently full.`}
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E40AF] disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              <Ticket className="h-4 w-4" />
              {submitting ? 'Allocating Slot...' : 'Allocate Parking Slot'}
            </button>
          </div>
        </form>

        {/* Generated Ticket Panel */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6">
          {allocatedResult?.ticket ? (
            <div className="space-y-5">
              <div className="flex items-start gap-3 border-b border-slate-200 pb-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <h2 className="text-base font-semibold text-[#0F172A]">
                    Parking Ticket Issued
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">{allocatedResult.message}</p>
                </div>
              </div>

              {/* Ticket details */}
              <div className="rounded-lg border border-slate-200 bg-[#0B192C] p-5 text-white">
                <div className="flex items-center justify-between border-b border-white/15 pb-3">
                  <div>
                    <p className="text-[11px] text-slate-300">Ticket ID</p>
                    <p className="font-mono text-xl font-bold tracking-tight tabular-nums">
                      {allocatedResult.ticket.ticketId}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-300">Allocated Slot</p>
                    <p className="font-mono text-xl font-bold text-blue-300 tabular-nums">
                      {allocatedResult.ticket.slotId}
                    </p>
                  </div>
                </div>

                <dl className="mt-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-300">Vehicle Number</dt>
                    <dd className="font-mono font-semibold text-white">
                      {allocatedResult.ticket.vehicleNumber}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-300">Vehicle Type</dt>
                    <dd className="font-medium text-white">
                      {allocatedResult.ticket.vehicleType}
                    </dd>
                  </div>
                  {allocatedResult.slot && (
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-300">Parking Zone</dt>
                      <dd className="font-medium text-white">{allocatedResult.slot.zone}</dd>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-300">Entry Time</dt>
                    <dd className="font-mono tabular-nums text-white">
                      {allocatedResult.ticket.entryTimeDisplay}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-300">Applicable Tariff</dt>
                    <dd className="font-mono tabular-nums text-blue-200">
                      ₹{allocatedResult.hourlyRate ?? (allocatedResult.ticket.vehicleType === 'Car' ? 40 : 20)} / hour
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="flex flex-wrap gap-2.5 no-print">
                <button
                  type="button"
                  onClick={handlePrintTicket}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-[#0F172A] hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Ticket
                </button>
                <button
                  type="button"
                  onClick={() => onGoToExit(allocatedResult.ticket!.ticketId)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0B192C] px-4 py-2 text-xs font-medium text-white hover:bg-[#13294B] transition-colors whitespace-nowrap"
                >
                  Process Exit
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-[#0F172A]">Ticket Preview</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Complete the entry form to assign the lowest available bay for the chosen vehicle type and generate a unique parking ticket ID.
              </p>

              <div className="border-t border-slate-200 pt-4 space-y-2.5 text-xs text-slate-600">
                <p className="font-semibold text-[#0F172A]">Automated C++ Allocation Rules</p>
                <ul className="space-y-1.5 list-disc pl-4">
                  <li>Car bays: C-01 through C-20 (₹40 per hour)</li>
                  <li>Bike bays: B-01 through B-16 (₹20 per hour)</li>
                  <li>Partial hours are rounded up; minimum 1-hour charge applies</li>
                  <li>Duplicate active registrations are automatically rejected</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={onGoToSlots}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1D4ED8] hover:text-[#1E40AF]"
              >
                Inspect live slot map
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
