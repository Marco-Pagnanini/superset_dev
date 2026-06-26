import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { config } from '../config/env';
import { listCharts, getChartData } from '../services/chart.service';

/** GET /api/charts — chart di cui l'utente è owner. */
export const list = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await listCharts());
});

/** GET /api/charts/:id/data?trinoServer=&userDb= — esegue la query del chart. */
export const data = asyncHandler(async (req: Request, res: Response) => {
  const trinoServer = String(req.query.trinoServer || config.embed.defaultTrinoServer);
  const userDb = String(req.query.userDb || config.embed.defaultUserDb);
  res.json(await getChartData(req.params.id as string, trinoServer, userDb));
});
