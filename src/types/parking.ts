export type VehicleType = 'Car' | 'Bike';

export type NavSection =
  | 'dashboard'
  | 'entry'
  | 'exit'
  | 'slots'
  | 'tickets'
  | 'history';

export interface ParkingSlot {
  slotId: string;
  vehicleType: VehicleType;
  zone: string;
  isOccupied: boolean;
  status: 'Available' | 'Occupied';
  vehicleNumber: string;
  ticketId: string;
  occupiedSince: number;
  occupiedSinceIso: string;
  occupiedSinceDisplay: string;
  statusLabel: string;
}

export interface ParkingTicket {
  ticketId: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  slotId: string;
  entryTime: number;
  entryTimeIso: string;
  entryTimeDisplay: string;
  exitTime: number;
  exitTimeIso: string;
  exitTimeDisplay: string;
  status: 'Active' | 'Completed';
  durationMinutes: number;
  durationFormatted: string;
  billedHours: number;
  feeAmount: number;
}

export interface FeeBreakdown {
  vehicleType: VehicleType;
  durationMinutes: number;
  durationFormatted: string;
  billedHours: number;
  hourlyRate: number;
  totalFee: number;
  calculationFormula: string;
  billingRule: string;
}

export interface PaymentReceipt {
  paymentId: string;
  ticketId: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  slotId: string;
  entryTime: number;
  entryTimeIso: string;
  entryTimeDisplay: string;
  exitTime: number;
  exitTimeIso: string;
  exitTimeDisplay: string;
  date: string;
  durationMinutes: number;
  durationFormatted: string;
  billedHours: number;
  hourlyRate: number;
  amountPaid: number;
  paidAt: number;
  receiptText: string;
}

export interface DailyRevenuePoint {
  date: string;
  label: string;
  totalRevenue: number;
  carRevenue: number;
  bikeRevenue: number;
  transactions: number;
  carCount: number;
  bikeCount: number;
}

export interface DashboardSummary {
  totalCarSlots: number;
  availableCarSlots: number;
  occupiedCarSlots: number;
  totalBikeSlots: number;
  availableBikeSlots: number;
  occupiedBikeSlots: number;
  totalSlots: number;
  availableSlots: number;
  currentlyParkedVehicles: number;
  totalCompletedTransactions: number;
  totalRevenue: number;
  todayRevenue: number;
  carRevenue: number;
  bikeRevenue: number;
  averageDurationMinutes: number;
}

export interface DashboardResponse {
  success: boolean;
  summary: DashboardSummary;
  tariff: {
    carRatePerHour: number;
    bikeRatePerHour: number;
    minimumHours: number;
    roundingRule: string;
  };
  dailyRevenue: DailyRevenuePoint[];
  recentActivity: ParkingTicket[];
  error?: string;
}

export interface SlotsResponse {
  success: boolean;
  summary: {
    totalCarSlots: number;
    availableCarSlots: number;
    occupiedCarSlots: number;
    totalBikeSlots: number;
    availableBikeSlots: number;
    occupiedBikeSlots: number;
  };
  carSlots: ParkingSlot[];
  bikeSlots: ParkingSlot[];
  error?: string;
}

export interface EntryResponse {
  success: boolean;
  message?: string;
  error?: string;
  errorCode?: string;
  ticket?: ParkingTicket;
  slot?: ParkingSlot;
  hourlyRate?: number;
}

export interface ExitPreviewResponse {
  success: boolean;
  error?: string;
  errorCode?: string;
  ticket?: ParkingTicket;
  exitTime?: number;
  exitTimeIso?: string;
  exitTimeDisplay?: string;
  feeBreakdown?: FeeBreakdown;
}

export interface ExitConfirmResponse {
  success: boolean;
  message?: string;
  error?: string;
  errorCode?: string;
  ticket?: ParkingTicket;
  feeBreakdown?: FeeBreakdown;
  receipt?: PaymentReceipt;
}

export interface TicketsResponse {
  success: boolean;
  counts: {
    total: number;
    active: number;
    completed: number;
    matched: number;
  };
  tickets: ParkingTicket[];
  error?: string;
}

export interface HistoryResponse {
  success: boolean;
  totals: {
    allTimeRevenue: number;
    todayRevenue: number;
    totalCompletedTransactions: number;
    filteredCount: number;
    filteredRevenue: number;
    carTransactions: number;
    bikeTransactions: number;
    averageFee: number;
    averageDurationMinutes: number;
  };
  availableDates: string[];
  dailyRevenue: DailyRevenuePoint[];
  records: PaymentReceipt[];
  error?: string;
}

export interface CppBackendInfo {
  success: boolean;
  engine: string;
  classes: string[];
  methods: string[];
  storageFiles: {
    name: string;
    records: number;
    bytes: number;
  }[];
}
