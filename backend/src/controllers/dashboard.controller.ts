import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { HttpError } from '../errors';
import {
  listDashboards,
  getDashboardCharts,
  createGuestToken,
  buildDashboard,
  getNativeFilters,
  setFilterDefault,
  createPermalink,
  getFilterOptions,
  invalidatePermalinkCache,
  requestDashboardScreenshot,
  getDashboardPdf,
} from '../services/dashboard.service';
import { saveFilterState, getFilterState } from '../services/filterState.store';

/** GET /api/dashboards — elenco dashboard non pubblicate. */
export const list = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await listDashboards());
});

/** POST /api/dashboards/guest-token — guest token per l'embedding. */
export const guestToken = asyncHandler(async (req: Request, res: Response) => {
  const { dashboardId, trinoServer, userDb } = req.body;
  if (!dashboardId) throw new HttpError(400, 'dashboardId obbligatorio');
  res.json(await createGuestToken({ dashboardId, trinoServer, userDb }));
});

/** GET /api/dashboards/:id/charts — chart presenti nella dashboard. */
export const charts = asyncHandler(async (req: Request, res: Response) => {
  res.json(await getDashboardCharts(req.params.id as string));
});

/** GET /api/dashboards/:id/native-filters — filtri nativi configurati. */
export const nativeFilters = asyncHandler(async (req: Request, res: Response) => {
  res.json(await getNativeFilters(req.params.id as string));
});

/** POST /api/dashboards/:id/set-filter-default — default (es. time range) di un filtro. */
export const setFilterDefaultCtrl = asyncHandler(async (req: Request, res: Response) => {
  const { filterName = 'Periodo', timeRange = 'Last week' } = req.body;
  res.json(await setFilterDefault(req.params.id as string, filterName, timeRange));
});

/** POST /api/dashboards/:id/permalink — crea/riusa un permalink per uno stato filtri. */
export const permalink = asyncHandler(async (req: Request, res: Response) => {
  const { dataMask, filterId, timeRange } = req.body;
  res.json(await createPermalink(req.params.id as string, { dataMask, filterId, timeRange }));
});

/** GET /api/dashboards/:id/filter-state?userId= — ultimo stato filtri salvato. */
export const getFilterStateCtrl = asyncHandler(async (req: Request, res: Response) => {
  const userId = String(req.query.userId || '');
  if (!userId) throw new HttpError(400, 'userId obbligatorio');
  const dataMask = getFilterState(req.params.id as string, userId);
  res.json(dataMask ? { dataMask } : {});
});

/** POST /api/dashboards/:id/filter-state — salva l'ultimo stato filtri dell'utente. */
export const saveFilterStateCtrl = asyncHandler(async (req: Request, res: Response) => {
  const { dataMask, userId } = req.body;
  if (!dataMask) throw new HttpError(400, 'dataMask obbligatorio');
  if (!userId) throw new HttpError(400, 'userId obbligatorio');
  const id = req.params.id as string;
  saveFilterState(id, userId, dataMask);
  // Il nuovo stato rende obsoleti i permalink cache-ati per questa dashboard.
  invalidatePermalinkCache(id);
  res.json({ ok: true });
});

/** GET /api/dashboards/:id/filter-options/:filterId — valori distinti di un filtro. */
export const filterOptions = asyncHandler(async (req: Request, res: Response) => {
  res.json(await getFilterOptions(req.params.id as string, req.params.filterId as string));
});

/** POST /api/dashboards/:id/screenshot — step 1 export: genera lo screenshot, ritorna il digest. */
export const requestScreenshot = asyncHandler(async (req: Request, res: Response) => {
  const { dataMask } = req.body ?? {};
  res.json(await requestDashboardScreenshot(req.params.id as string, dataMask));
});

/** GET /api/dashboards/:id/screenshot/:digest/pdf — step 2 export: scarica il PDF. */
export const downloadPdf = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const pdf = await getDashboardPdf(id, req.params.digest as string);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="dashboard-${id}.pdf"`);
  res.send(pdf);
});

/** POST /api/dashboards/build — aggiunge/rimuove chart e ricostruisce il layout. */
export const build = asyncHandler(async (req: Request, res: Response) => {
  const { dashboardId, chartIds = [], removeIds = [], trinoServer, userDb } = req.body;
  if (!dashboardId) throw new HttpError(400, 'dashboardId obbligatorio');
  if (chartIds.length === 0 && removeIds.length === 0) {
    throw new HttpError(400, 'Nessuna modifica da applicare');
  }
  res.json(await buildDashboard({ dashboardId, chartIds, removeIds, trinoServer, userDb }));
});
