import axios from 'axios';
import { getSupersetTokens } from '../superset/auth';
import { SUPERSET_URL, readHeaders } from '../superset/client';
import { HttpError } from '../errors';
import type { ChartDto } from '../types';

/**
 * Ricava l'id utente dal claim `sub` del JWT di access.
 * Evitiamo `GET /api/v1/me/`: in alcune installazioni Superset risponde 401 al JWT
 * (mentre gli altri endpoint funzionano), e l'id ci serve solo per filtrare gli owner.
 */
function getUserIdFromToken(accessToken: string): number | null {
  try {
    const part = accessToken.split('.')[1];
    if (!part) return null;
    const payload = JSON.parse(Buffer.from(part, 'base64').toString('utf8'));
    const id = Number(payload.sub);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

/**
 * Elenca i chart di cui l'utente corrente è owner.
 * Superset: `GET /api/v1/chart/?q={filters:[{owners=userId}], page_size:100}`
 * (l'id utente viene dal claim `sub` del JWT; senza id, elenca tutti i chart).
 */
export async function listCharts(): Promise<ChartDto[]> {
  const tokens = await getSupersetTokens();
  const headers = readHeaders(tokens);

  const userId = getUserIdFromToken(tokens.accessToken);
  const filters = userId !== null ? [{ col: 'owners', opr: 'rel_m_m', value: userId }] : [];

  const res = await axios.get(`${SUPERSET_URL}/api/v1/chart/`, {
    params: {
      q: JSON.stringify({ filters, page_size: 100 }),
    },
    headers,
  });

  return res.data.result.map((c: any): ChartDto => ({
    id: c.id,
    uuid: c.uuid,
    title: c.slice_name,
    viz_type: c.viz_type,
    datasource_id: c.datasource_id,
  }));
}

/**
 * Esegue la query di un chart e ne restituisce i dati.
 *
 * Riusa il `query_context` salvato sul chart (lo stesso che Superset usa quando
 * lo apre) e lo rilancia su `POST /api/v1/chart/data`, passando i parametri
 * multi-tenant Trino (`trino_server`, `user_db`) nella query string dell'URL.
 */
export async function getChartData(
  chartId: string | number,
  trinoServer: string,
  userDb: string,
): Promise<{ viz_type: string; slice_name: string; data: unknown }> {
  const tokens = await getSupersetTokens();
  const headers = readHeaders(tokens);

  const chartRes = await axios.get(`${SUPERSET_URL}/api/v1/chart/${chartId}`, { headers });
  const chart = chartRes.data.result;

  if (!chart.query_context) {
    throw new HttpError(400, 'query_context mancante: apri il chart in Superset, salvalo e riprova.');
  }

  const queryContext = JSON.parse(chart.query_context);
  queryContext.force = true;

  const urlParams = new URLSearchParams({ trino_server: trinoServer, user_db: userDb });

  const dataRes = await axios.post(
    `${SUPERSET_URL}/api/v1/chart/data?${urlParams}`,
    queryContext,
    { headers: { ...headers, 'Content-Type': 'application/json' } },
  );

  return {
    viz_type: chart.viz_type,
    slice_name: chart.slice_name,
    data: dataRes.data,
  };
}
