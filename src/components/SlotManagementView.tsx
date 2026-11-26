import { Bike, Car, RefreshCw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchSlots } from '../api/parkingApi';
import type { ParkingSlot, SlotsResponse, VehicleType } from '../types/parking';

interface SlotManagementViewProps {
  refreshSignal: number;
  onSelectAvailableSlot: (vehicleType: VehicleType) => void;
  onSelectOccupiedSlot: (ticketId: string) => void;
}

export function SlotManagementView({
  refreshSignal,
  onSelectAvailableSlot,
  onSelectOccupiedSlot,
}: SlotManagementViewProps) {
  const [data, setData] = useState<SlotsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Available' | 'Occupied'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  async function loadSlots() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSlots();
      if (!res.success) {
        setError(res.error ?? 'Failed to load parking slots.');
      } else {
        setData(res);
      }
    } catch {
      setError('Unable to reach C++ backend for slot status.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSlots();
  }, [refreshSignal]);

  function filterSlot(slot: ParkingSlot): boolean {
    if (statusFilter === 'Available' && slot.isOccupied) return false;
    if (statusFilter === 'Occupied' && !slot.isOccupied) return false;
    const q = searchQuery.trim().toUpperCase();
    if (!q) return true;
    return (
      slot.slotId.toUpperCase().includes(q) ||
      slot.vehicleNumber.toUpperCase().includes(q) ||
      slot.ticketId.toUpperCase().includes(q)
    );
  }

  const filteredCarSlots = (data?.carSlots ?? []).filter(filterSlot);
  const filteredBikeSlots = (data?.bikeSlots ?? []).filter(filterSlot);

  function renderSlotCard(slot: ParkingSlot) {
    const occupied = slot.isOccupied;
    return (
      <button
        key={slot.slotId}
        type="button"
        onClick={() => {
          if (occupied) {
            onSelectOccupiedSlot(slot.ticketId);
          } else {
            onSelectAvailableSlot(slot.vehicleType);
          }
        }}
        className={`group flex flex-col justify-between rounded-lg border p-3.5 text-left transition-all ${
          occupied
            ? 'border-red-300 bg-red-50/90 hover:border-red-400 hover:bg-red-100/80'
            : 'border-emerald-300 bg-emerald-50/80 hover:border-emerald-500 hover:bg-emerald-100/70'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={`font-mono text-sm font-bold tabular-nums ${
              occupied ? 'text-red-900' : 'text-emerald-950'
            }`}
          >
            {slot.slotId}
          </span>
          <span
            className={`text-[11px] font-semibold ${
              occupied ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            {occupied ? 'Occupied' : 'Available'}
          </span>
        </div>

        <div className="mt-3 min-h-[2.4rem]">
          {occupied ? (
            <>
              <p className="font-mono text-xs font-semibold text-red-950 truncate">
                {slot.vehicleNumber}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-red-700/90 tabular-nums">
                {slot.ticketId}
              </p>
            </>
          ) : (
            <p className="text-xs text-emerald-800/90">Click to park {slot.vehicleType.toLowerCase()}</p>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Parking Slot Management
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Visual live layout of all car and bike parking slots. Click an available slot to park or an occupied slot to process exit.
          </p>
        </div>

        <button
          type="button"
          onClick={loadSlots}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      {/* Filter & Legend Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(['All', 'Available', 'Occupied'] as const).map((status) => (
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

          <div className="flex items-center gap-4 text-xs text-slate-600 pl-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs border border-emerald-400 bg-emerald-100" />
              Green = Available
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs border border-red-400 bg-red-100" />
              Red = Occupied
            </span>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by slot, plate, or ticket..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-[#0F172A] placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Car Parking Section */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <Car className="h-5 w-5 text-[#1D4ED8]" />
            <div>
              <h2 className="text-base font-semibold text-[#0F172A]">Car Parking Section</h2>
              <p className="text-xs text-slate-500">Bays C-01 to C-20 · Tariff ₹40 / hour</p>
            </div>
          </div>
          {data && (
            <div className="flex items-center gap-3 text-xs tabular-nums">
              <span className="font-medium text-emerald-700">
                {data.summary.availableCarSlots} Available
              </span>
              <span className="text-slate-300">·</span>
              <span className="font-medium text-red-700">
                {data.summary.occupiedCarSlots} Occupied
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-600">{data.summary.totalCarSlots} Total</span>
            </div>
          )}
        </div>

        {loading && !data ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, idx) => (
              <div key={idx} className="h-24 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : filteredCarSlots.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No car slots match your current filter.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {filteredCarSlots.map(renderSlotCard)}
          </div>
        )}
      </section>

      {/* Bike Parking Section */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <Bike className="h-5 w-5 text-[#0B192C]" />
            <div>
              <h2 className="text-base font-semibold text-[#0F172A]">Bike Parking Section</h2>
              <p className="text-xs text-slate-500">Bays B-01 to B-16 · Tariff ₹20 / hour</p>
            </div>
          </div>
          {data && (
            <div className="flex items-center gap-3 text-xs tabular-nums">
              <span className="font-medium text-emerald-700">
                {data.summary.availableBikeSlots} Available
              </span>
              <span className="text-slate-300">·</span>
              <span className="font-medium text-red-700">
                {data.summary.occupiedBikeSlots} Occupied
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-600">{data.summary.totalBikeSlots} Total</span>
            </div>
          )}
        </div>

        {loading && !data ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="h-24 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : filteredBikeSlots.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No bike slots match your current filter.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4">
            {filteredBikeSlots.map(renderSlotCard)}
          </div>
        )}
      </section>
    </div>
  );
}
