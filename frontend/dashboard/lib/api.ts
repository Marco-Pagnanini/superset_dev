import type {
  Dashboard,
  Chart,
  NativeFilter,
  GuestTokenResponse,
  DataMask,
  ChartDataResponse,
  FilterOptionsResponse,
  ScreenshotResponse,
} from './types';

/**
 * Client tipizzato verso il backend Superset.
 * Tutti gli URL hardcoded del vecchio frontend/test sono qui, configurabili via env.
 */

/** Base URL del backend (Express/TS). */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

/** Dominio Superset usato dall'embedded SDK per montare l'iframe. */
export const SUPERSET_DOMAIN = process.env.NEXT_PUBLIC_SUPERSET_URL ?? 'http://localhost:8088';

/**
 * Identificativo utente usato per salvare/ripristinare lo stato filtri.
 * TODO: sostituire con l'utente autenticato quando disponibile.
 */
export const USER_ID = process.env.NEXT_PUBLIC_USER_ID ?? '4cosite_000415_it';

const DASHBOARDS = `${API_BASE}/dashboards`;
const CHARTS = `${API_BASE}/charts`;

/** Esegue una fetch JSON, lanciando un Error con il messaggio del backend in caso di errore. */
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data && (data as any).error)) {
    const err = (data as any)?.error ?? `HTTP ${res.status}`;
    throw new Error(typeof err === 'string' ? err : JSON.stringify(err));
  }
  return data as T;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function listDashboards(): Promise<Dashboard[]> {
  return request<Dashboard[]>(DASHBOARDS);
}

export function getDashboardCharts(dashboardId: number | string): Promise<Chart[]> {
  return request<Chart[]>(`${DASHBOARDS}/${dashboardId}/charts`);
}

/** Richiede un guest token per l'embedding di una dashboard. */
export function fetchGuestToken(
  dashboardId: number | string,
  opts?: { trinoServer?: string; userDb?: string },
): Promise<GuestTokenResponse> {
  return request<GuestTokenResponse>(`${DASHBOARDS}/guest-token`, {
    method: 'POST',
    body: JSON.stringify({ dashboardId, ...opts }),
  });
}

/** Aggiunge/rimuove chart e ricostruisce il layout; ritorna un guest token aggiornato. */
export function buildDashboard(
  dashboardId: number | string,
  chartIds: number[],
  removeIds: number[] = [],
): Promise<GuestTokenResponse> {
  return request<GuestTokenResponse>(`${DASHBOARDS}/build`, {
    method: 'POST',
    body: JSON.stringify({ dashboardId, chartIds, removeIds }),
  });
}

// ─── Stato filtri (persistenza per utente) ────────────────────────────────────

/** Legge l'ultimo stato filtri salvato per la dashboard + utente. */
export async function getSavedFilterState(dashboardId: number | string): Promise<DataMask | null> {
  try {
    const data = await request<{ dataMask?: DataMask }>(
      `${DASHBOARDS}/${dashboardId}/filter-state?userId=${encodeURIComponent(USER_ID)}`,
    );
    return data.dataMask ?? null;
  } catch {
    return null;
  }
}

/** Salva lo stato filtri corrente per la dashboard + utente. */
export function saveFilterState(dashboardId: number | string, dataMask: DataMask): Promise<{ ok: true }> {
  return request<{ ok: true }>(`${DASHBOARDS}/${dashboardId}/filter-state`, {
    method: 'POST',
    body: JSON.stringify({ dataMask, userId: USER_ID }),
  });
}

/** Converte un dataMask grezzo (legacy) in una permalink key via API Superset. */
export async function getPermalinkKey(dashboardId: number | string, dataMask: DataMask): Promise<string | null> {
  try {
    const data = await request<{ key?: string }>(`${DASHBOARDS}/${dashboardId}/permalink`, {
      method: 'POST',
      body: JSON.stringify({ dataMask }),
    });
    return data.key ?? null;
  } catch {
    return null;
  }
}

// ─── Filtri nativi ─────────────────────────────────────────────────────────────

export function getNativeFilters(dashboardId: number | string): Promise<NativeFilter[]> {
  return request<NativeFilter[]>(`${DASHBOARDS}/${dashboardId}/native-filters`);
}

export function getFilterOptions(
  dashboardId: number | string,
  filterId: string,
): Promise<FilterOptionsResponse> {
  return request<FilterOptionsResponse>(`${DASHBOARDS}/${dashboardId}/filter-options/${filterId}`);
}

export function setFilterDefault(
  dashboardId: number | string,
  filterName: string,
  timeRange: string,
): Promise<{ ok: true; filterId: string; filterName: string; timeRange: string }> {
  return request(`${DASHBOARDS}/${dashboardId}/set-filter-default`, {
    method: 'POST',
    body: JSON.stringify({ filterName, timeRange }),
  });
}

// ─── Export PDF (screenshot Superset) ─────────────────────────────────────────

/** Step 1: chiede a Superset lo screenshot della dashboard e ottiene il digest. */
export function requestDashboardScreenshot(
  dashboardId: number | string,
  dataMask?: DataMask,
): Promise<ScreenshotResponse> {
  return request<ScreenshotResponse>(`${DASHBOARDS}/${dashboardId}/screenshot`, {
    method: 'POST',
    body: JSON.stringify({ dataMask }),
  });
}

/** Step 2: scarica il PDF (con il digest) e ne forza il download nel browser. */
export async function downloadDashboardPdf(
  dashboardId: number | string,
  digest: string,
  filename = `dashboard-${dashboardId}.pdf`,
): Promise<void> {
  const res = await fetch(`${DASHBOARDS}/${dashboardId}/screenshot/${digest}/pdf`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any)?.error ?? `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Chart ──────────────────────────────────────────────────────────────────

export function listCharts(): Promise<Chart[]> {
  return request<Chart[]>(CHARTS);
}

/** Esegue la query di un chart e ne restituisce i dati (con parametri Trino). */
export function getChartData(
  chartId: number | string,
  opts?: { trinoServer?: string; userDb?: string },
): Promise<ChartDataResponse> {
  const params = new URLSearchParams();
  if (opts?.trinoServer) params.set('trinoServer', opts.trinoServer);
  if (opts?.userDb) params.set('userDb', opts.userDb);
  const qs = params.toString();
  return request<ChartDataResponse>(`${CHARTS}/${chartId}/data${qs ? `?${qs}` : ''}`);
}
