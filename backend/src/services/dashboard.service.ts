import axios from 'axios';
import { getSupersetTokens } from '../superset/auth';
import { SUPERSET_URL, readHeaders, writeHeaders } from '../superset/client';
import { config } from '../config/env';
import { HttpError } from '../errors';
import type { DashboardDto, ChartDto, NativeFilterDto, GuestTokenResponse, DataMask } from '../types';

// ─── Lettura dashboard / chart ──────────────────────────────────────────────

/**
 * Elenca le dashboard NON pubblicate.
 * Superset: `GET /api/v1/dashboard/?q={filters:[{published=false}], page_size:100}`
 */
export async function listDashboards(): Promise<DashboardDto[]> {
  const tokens = await getSupersetTokens();
  const res = await axios.get(`${SUPERSET_URL}/api/v1/dashboard/`, {
    params: {
      q: JSON.stringify({
        filters: [{ col: 'published', opr: 'eq', value: false }],
        page_size: 100,
      }),
    },
    headers: readHeaders(tokens),
  });

  return res.data.result.map((d: any): DashboardDto => ({
    id: d.id,
    title: d.dashboard_title,
    uuid: d.uuid,
  }));
}

/**
 * Elenca i chart attualmente presenti in una dashboard.
 * Superset: `GET /api/v1/dashboard/:id/charts`
 */
export async function getDashboardCharts(dashboardId: string | number): Promise<ChartDto[]> {
  const tokens = await getSupersetTokens();
  const res = await axios.get(`${SUPERSET_URL}/api/v1/dashboard/${dashboardId}/charts`, {
    headers: readHeaders(tokens),
  });

  return res.data.result.map((c: any): ChartDto => ({
    id: c.id,
    uuid: c.uuid,
    title: c.slice_name,
    viz_type: c.viz_type,
  }));
}

// ─── Embedding ──────────────────────────────────────────────────────────────

/** Legge l'embed UUID di una dashboard, oppure `undefined` se non abilitato. */
async function getEmbeddedUuid(dashboardId: string | number, accessToken: string): Promise<string | undefined> {
  const res = await axios.get(`${SUPERSET_URL}/api/v1/dashboard/${dashboardId}/embedded`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data.result?.uuid;
}

/**
 * Crea un guest token per l'embedding di una dashboard.
 *
 * Passi:
 *  1. Recupera l'embed UUID (`GET .../embedded`). Se 404 → embedding non abilitato.
 *  2. Resetta `allowed_domains: []` così l'iframe è caricabile da qualunque origine.
 *  3. `POST /api/v1/security/guest_token/` con username `${trinoServer}|${userDb}`.
 */
export async function createGuestToken(opts: {
  dashboardId: string | number;
  trinoServer?: string;
  userDb?: string;
}): Promise<GuestTokenResponse> {
  const { dashboardId } = opts;
  const trinoServer = opts.trinoServer || config.embed.defaultTrinoServer;
  const userDb = opts.userDb || config.embed.defaultUserDb;

  const tokens = await getSupersetTokens();

  let embedUuid: string | undefined;
  try {
    embedUuid = await getEmbeddedUuid(dashboardId, tokens.accessToken);
  } catch (e: any) {
    if (e.response?.status === 404) {
      throw new HttpError(400, 'Embedding non abilitato. Vai su Superset → Dashboard → ⋮ → Embed Dashboard');
    }
    throw e;
  }
  if (!embedUuid) {
    throw new HttpError(400, 'Embedding non abilitato. Vai su Superset → Dashboard → ⋮ → Embed Dashboard');
  }

  // Reset allowed_domains: non bloccante (logghiamo e proseguiamo se fallisce).
  try {
    await axios.put(
      `${SUPERSET_URL}/api/v1/dashboard/${dashboardId}/embedded`,
      { allowed_domains: [] },
      { headers: writeHeaders(tokens) },
    );
  } catch (e: any) {
    console.warn('[createGuestToken] reset allowed_domains fallito:', e.response?.data || e.message);
  }

  const guestRes = await axios.post(
    `${SUPERSET_URL}/api/v1/security/guest_token/`,
    {
      user: { username: `${trinoServer}|${userDb}`, first_name: 'pippo', last_name: 'pluto' },
      resources: [{ type: 'dashboard', id: embedUuid }],
      rls: [],
    },
    { headers: writeHeaders(tokens) },
  );

  return { id: embedUuid, token: guestRes.data.token };
}

// ─── Build layout dashboard ───────────────────────────────────────────────────

/**
 * Costruisce il `position_json` di Superset (layout a griglia) disponendo i chart
 * su righe da `perRow` colonne. Versione 'v2' del formato layout.
 */
function buildPositionJson(chartIds: number[]): string {
  const COLS = 12;
  const perRow = 2;
  const position: Record<string, any> = {
    DASHBOARD_VERSION_KEY: 'v2',
    ROOT_ID: { type: 'ROOT', id: 'ROOT_ID', children: ['GRID_ID'] },
    GRID_ID: { type: 'GRID', id: 'GRID_ID', children: [], parents: ['ROOT_ID'] },
  };

  for (let i = 0; i < chartIds.length; i += perRow) {
    const rowId = `ROW-${i}`;
    const slice = chartIds.slice(i, i + perRow);
    const colWidth = Math.floor(COLS / slice.length);
    position['GRID_ID'].children.push(rowId);
    position[rowId] = {
      type: 'ROW',
      id: rowId,
      children: slice.map((id) => `CHART-${id}`),
      parents: ['ROOT_ID', 'GRID_ID'],
      meta: { background: 'BACKGROUND_TRANSPARENT' },
    };
    slice.forEach((chartId) => {
      const key = `CHART-${chartId}`;
      position[key] = {
        type: 'CHART',
        id: key,
        children: [],
        parents: ['ROOT_ID', 'GRID_ID', rowId],
        meta: { chartId, width: colWidth, height: 50 },
      };
    });
  }
  return JSON.stringify(position);
}

/** Aggiorna la lista `dashboards` di un chart (associa o dissocia la dashboard). */
async function updateChartDashboards(
  chartId: number,
  dashboardId: number,
  mode: 'add' | 'remove',
  tokens: Awaited<ReturnType<typeof getSupersetTokens>>,
): Promise<void> {
  try {
    const chartRes = await axios.get(`${SUPERSET_URL}/api/v1/chart/${chartId}`, {
      headers: readHeaders(tokens),
    });
    const existingIds: number[] = (chartRes.data.result.dashboards || []).map((d: any) => d.id);
    const nextIds =
      mode === 'add'
        ? [...new Set([...existingIds, dashboardId])]
        : existingIds.filter((id) => id !== dashboardId);
    await axios.put(
      `${SUPERSET_URL}/api/v1/chart/${chartId}`,
      { dashboards: nextIds },
      { headers: writeHeaders(tokens) },
    );
  } catch (e: any) {
    console.error(`[build] errore ${mode} chart ${chartId}:`, e.response?.status, e.response?.data?.message || e.message);
  }
}

/**
 * Aggiunge/rimuove chart da una dashboard e ne ricostruisce il layout, poi
 * restituisce un guest token aggiornato per ri-embeddare.
 *
 * Passi:
 *  1. Per ogni chart in `chartIds`: associa la dashboard al chart.
 *  2. Per ogni chart in `removeIds`: dissocia la dashboard dal chart.
 *  3. Rilegge i chart correnti e riscrive `position_json`.
 *  4. Garantisce l'embed UUID (lo crea se assente) e genera un guest token.
 */
export async function buildDashboard(opts: {
  dashboardId: number;
  chartIds?: number[];
  removeIds?: number[];
  trinoServer?: string;
  userDb?: string;
}): Promise<GuestTokenResponse> {
  const { dashboardId, chartIds = [], removeIds = [] } = opts;
  const trinoServer = opts.trinoServer || config.embed.defaultTrinoServer;
  const userDb = opts.userDb || config.embed.defaultUserDb;

  const tokens = await getSupersetTokens();

  await Promise.all(chartIds.map((id) => updateChartDashboards(id, dashboardId, 'add', tokens)));
  await Promise.all(removeIds.map((id) => updateChartDashboards(id, dashboardId, 'remove', tokens)));

  const currentChartsRes = await axios.get(`${SUPERSET_URL}/api/v1/dashboard/${dashboardId}/charts`, {
    headers: readHeaders(tokens),
  });
  const currentChartIds: number[] = currentChartsRes.data.result.map((c: any) => c.id);

  await axios.put(
    `${SUPERSET_URL}/api/v1/dashboard/${dashboardId}`,
    { position_json: buildPositionJson(currentChartIds) },
    { headers: writeHeaders(tokens) },
  );

  // Garantisce l'embed UUID: se manca, abilita l'embedding e rilegge.
  let embedUuid = await getEmbeddedUuid(dashboardId, tokens.accessToken);
  if (!embedUuid) {
    await axios.post(
      `${SUPERSET_URL}/api/v1/dashboard/${dashboardId}/embedded`,
      { allowed_domains: [] },
      { headers: writeHeaders(tokens) },
    );
    embedUuid = await getEmbeddedUuid(dashboardId, tokens.accessToken);
  }
  if (!embedUuid) throw new HttpError(500, 'Impossibile recuperare embed UUID');

  const guestRes = await axios.post(
    `${SUPERSET_URL}/api/v1/security/guest_token/`,
    {
      user: { username: `${trinoServer}|${userDb}`, first_name: 'pippo', last_name: 'pluto' },
      resources: [{ type: 'dashboard', id: embedUuid }],
      rls: [],
    },
    { headers: writeHeaders(tokens) },
  );

  return { id: embedUuid, token: guestRes.data.token };
}

// ─── Native filters ───────────────────────────────────────────────────────────

/**
 * Estrae i filtri nativi configurati su una dashboard, leggendoli da
 * `json_metadata.native_filter_configuration`.
 * Superset: `GET /api/v1/dashboard/:id`
 */
export async function getNativeFilters(dashboardId: string | number): Promise<NativeFilterDto[]> {
  const tokens = await getSupersetTokens();
  const res = await axios.get(`${SUPERSET_URL}/api/v1/dashboard/${dashboardId}`, {
    headers: readHeaders(tokens),
  });

  const meta = JSON.parse(res.data.result.json_metadata || '{}');
  return (meta.native_filter_configuration || []).map((f: any): NativeFilterDto => ({
    id: f.id,
    name: f.name,
    filterType: f.filterType,
    defaultDataMask: f.defaultDataMask || {},
    targets: f.targets || [],
  }));
}

/**
 * Imposta il valore di default di un filtro nativo (per nome), tipicamente un
 * time range. Rilegge il `json_metadata`, modifica il `defaultDataMask` del filtro
 * e riscrive l'intero metadata.
 */
export async function setFilterDefault(
  dashboardId: string | number,
  filterName: string,
  timeRange: string,
): Promise<{ ok: true; filterId: string; filterName: string; timeRange: string }> {
  const tokens = await getSupersetTokens();
  const dashRes = await axios.get(`${SUPERSET_URL}/api/v1/dashboard/${dashboardId}`, {
    headers: readHeaders(tokens),
  });
  const meta = JSON.parse(dashRes.data.result.json_metadata || '{}');

  const filters = meta.native_filter_configuration || [];
  const idx = filters.findIndex((f: any) => f.name === filterName);
  if (idx === -1) {
    throw new HttpError(404, `Filtro "${filterName}" non trovato nella dashboard`);
  }

  filters[idx].defaultDataMask = {
    filterState: { value: timeRange },
    extraFormData: { time_range: timeRange },
    ownState: {},
  };
  meta.native_filter_configuration = filters;

  await axios.put(
    `${SUPERSET_URL}/api/v1/dashboard/${dashboardId}`,
    { json_metadata: JSON.stringify(meta) },
    { headers: writeHeaders(tokens) },
  );

  return { ok: true, filterId: filters[idx].id, filterName, timeRange };
}

/**
 * Recupera i valori distinti selezionabili per un filtro nativo (per popolare una
 * select lato UI). Trova dataset+colonna dal target del filtro e interroga i dati.
 * Superset: `POST /api/v1/chart/data` con groupby sulla colonna.
 */
export async function getFilterOptions(
  dashboardId: string | number,
  filterId: string,
): Promise<{ values: unknown[]; columnName: string; datasetId: number }> {
  const tokens = await getSupersetTokens();
  const dashRes = await axios.get(`${SUPERSET_URL}/api/v1/dashboard/${dashboardId}`, {
    headers: readHeaders(tokens),
  });
  const meta = JSON.parse(dashRes.data.result.json_metadata || '{}');
  const filter = (meta.native_filter_configuration || []).find((f: any) => f.id === filterId);
  if (!filter) throw new HttpError(404, 'Filtro non trovato');

  const target = filter.targets?.[0];
  if (!target?.datasetId || !target?.column?.name) {
    throw new HttpError(400, 'Filtro senza target colonna/dataset');
  }

  const datasetId: number = target.datasetId;
  const columnName: string = target.column.name;

  const chartDataRes = await axios.post(
    `${SUPERSET_URL}/api/v1/chart/data`,
    {
      datasource: { id: datasetId, type: 'table' },
      force: false,
      queries: [
        {
          groupby: [columnName],
          metrics: [],
          row_limit: 1000,
          order_desc: false,
          row_offset: 0,
          filters: [],
          extras: { having: '', where: '' },
        },
      ],
      result_format: 'json',
      result_type: 'results',
    },
    { headers: { ...readHeaders(tokens), 'Content-Type': 'application/json' } },
  );

  const rows: any[] = chartDataRes.data.result?.[0]?.data || [];
  const values = rows
    .map((r) => r[columnName])
    .filter((v) => v !== null && v !== undefined && v !== '')
    .sort();

  return { values, columnName, datasetId };
}

// ─── Permalink (deep-link a uno stato filtri) ─────────────────────────────────

const permalinkCache = new Map<string, { key: string; createdAt: number }>();
const PERMALINK_CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Crea (o riusa da cache) un permalink Superset che incapsula uno stato filtri,
 * restituendone la `key`. Quella key viene poi passata all'embedding come
 * `urlParams.permalink_key` per ripristinare i filtri.
 * Superset: `POST /api/v1/dashboard/:id/permalink`
 */
export async function createPermalink(
  dashboardId: string | number,
  opts: { dataMask?: DataMask; filterId?: string; timeRange?: string },
): Promise<{ key: string }> {
  let dataMask = opts.dataMask;
  const timeRange = opts.timeRange || 'Last week';

  if (!dataMask && opts.filterId) {
    dataMask = {
      [opts.filterId]: {
        id: opts.filterId,
        extraFormData: { time_range: timeRange },
        filterState: { value: timeRange },
      },
    };
  }
  if (!dataMask) throw new HttpError(400, 'dataMask o filterId obbligatorio');

  const cacheKey = `${dashboardId}:${JSON.stringify(dataMask)}`;
  const cached = permalinkCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < PERMALINK_CACHE_TTL_MS) {
    return { key: cached.key };
  }

  const tokens = await getSupersetTokens();
  const res = await axios.post(
    `${SUPERSET_URL}/api/v1/dashboard/${dashboardId}/permalink`,
    { dataMask },
    { headers: writeHeaders(tokens) },
  );

  const key: string = res.data.key;
  permalinkCache.set(cacheKey, { key, createdAt: Date.now() });
  return { key };
}

/** Invalida le voci di cache permalink relative a una dashboard. */
export function invalidatePermalinkCache(dashboardId: string | number): void {
  for (const key of permalinkCache.keys()) {
    if (key.startsWith(`${dashboardId}:`)) permalinkCache.delete(key);
  }
}

// ─── Screenshot / export PDF ──────────────────────────────────────────────────

/**
 * Step 1 dell'export: chiede a Superset di generare/cachare lo screenshot della
 * dashboard e restituisce il **digest** (cache_key) con cui scaricarlo poi.
 * La generazione è asincrona (la fa un worker + browser headless).
 *
 * Superset: `POST /api/v1/dashboard/:id/cache_dashboard_screenshot/`
 * Il `dataMask` opzionale fa sì che lo screenshot rispecchi i filtri correnti.
 */
export async function requestDashboardScreenshot(
  dashboardId: string | number,
  dataMask?: DataMask,
): Promise<{ digest: string; imageUrl: string; taskStatus: string }> {
  const tokens = await getSupersetTokens();
  const body = dataMask && Object.keys(dataMask).length > 0 ? { dataMask } : {};
  const res = await axios.post(
    `${SUPERSET_URL}/api/v1/dashboard/${dashboardId}/cache_dashboard_screenshot/`,
    body,
    { headers: writeHeaders(tokens) },
  );
  return { digest: res.data.cache_key, imageUrl: res.data.image_url, taskStatus: res.data.task_status };
}

/**
 * Step 2 dell'export: scarica il PDF dello screenshot identificato dal digest.
 * Lo screenshot è generato in modo asincrono: l'endpoint risponde 404 finché non
 * è pronto, quindi facciamo polling finché ottiene 200 (o scade il timeout).
 *
 * Superset: `GET /api/v1/dashboard/:id/screenshot/:digest/?download_format=pdf`
 */
export async function getDashboardPdf(dashboardId: string | number, digest: string): Promise<Buffer> {
  const tokens = await getSupersetTokens();
  const headers = { Authorization: `Bearer ${tokens.accessToken}`, Cookie: tokens.cookies };
  const url = `${SUPERSET_URL}/api/v1/dashboard/${dashboardId}/screenshot/${digest}/?download_format=pdf`;

  const maxAttempts = 40; // ~80s
  const intervalMs = 2000;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await axios.get(url, { headers, responseType: 'arraybuffer', validateStatus: () => true });
    if (res.status === 200) return Buffer.from(res.data);
    if (res.status !== 404) {
      const text = Buffer.from(res.data).toString('utf8');
      throw new HttpError(res.status, `Errore screenshot Superset: ${text.slice(0, 200)}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new HttpError(504, 'Timeout: screenshot non pronto. Verifica che il worker/headless browser di Superset sia attivo.');
}
