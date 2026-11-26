import type {
  CppBackendInfo,
  DashboardResponse,
  EntryResponse,
  ExitConfirmResponse,
  ExitPreviewResponse,
  HistoryResponse,
  SlotsResponse,
  TicketsResponse,
} from '../types/parking';

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T;
  return data;
}

export async function fetchDashboard(): Promise<DashboardResponse> {
  const res = await fetch('/api/dashboard');
  return parseJsonResponse<DashboardResponse>(res);
}

export async function fetchSlots(): Promise<SlotsResponse> {
  const res = await fetch('/api/slots');
  return parseJsonResponse<SlotsResponse>(res);
}

export async function parkVehicleApi(
  vehicleNumber: string,
  vehicleType: string
): Promise<EntryResponse> {
  const res = await fetch('/api/entry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vehicleNumber, vehicleType }),
  });
  return parseJsonResponse<EntryResponse>(res);
}

export async function previewExitApi(ticketId: string): Promise<ExitPreviewResponse> {
  const res = await fetch('/api/exit/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketId }),
  });
  return parseJsonResponse<ExitPreviewResponse>(res);
}

export async function confirmExitApi(ticketId: string): Promise<ExitConfirmResponse> {
  const res = await fetch('/api/exit/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketId }),
  });
  return parseJsonResponse<ExitConfirmResponse>(res);
}

export async function fetchTickets(params?: {
  q?: string;
  status?: string;
  type?: string;
}): Promise<TicketsResponse> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set('q', params.q);
  if (params?.status && params.status !== 'All') sp.set('status', params.status);
  if (params?.type && params.type !== 'All') sp.set('type', params.type);
  const qs = sp.toString();
  const res = await fetch(`/api/tickets${qs ? `?${qs}` : ''}`);
  return parseJsonResponse<TicketsResponse>(res);
}

export async function fetchHistory(params?: {
  q?: string;
  type?: string;
  date?: string;
}): Promise<HistoryResponse> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set('q', params.q);
  if (params?.type && params.type !== 'All') sp.set('type', params.type);
  if (params?.date && params.date !== 'All') sp.set('date', params.date);
  const qs = sp.toString();
  const res = await fetch(`/api/history${qs ? `?${qs}` : ''}`);
  return parseJsonResponse<HistoryResponse>(res);
}

export async function fetchCppBackendInfo(): Promise<CppBackendInfo> {
  const res = await fetch('/api/cpp-info');
  return parseJsonResponse<CppBackendInfo>(res);
}

export async function resetSampleDataApi(): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch('/api/reset-sample', { method: 'POST' });
  return parseJsonResponse<{ success: boolean; message?: string; error?: string }>(res);
}
