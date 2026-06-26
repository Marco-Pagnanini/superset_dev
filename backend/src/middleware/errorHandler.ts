import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { HttpError } from '../errors';

/**
 * Avvolge un handler async: cattura le promise rejected e le inoltra a
 * `next(err)`, così i controller non hanno bisogno di try/catch.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/**
 * Error handler centralizzato. Traduce:
 *  - `HttpError`      → il suo statusCode + payload
 *  - errori axios     → 500 + il body restituito da Superset (più informativo)
 *  - altro            → 500 + messaggio
 */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  const supersetBody = err?.response?.data;
  console.error(`[error] ${req.method} ${req.originalUrl}:`, supersetBody || err?.message);

  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.payload ?? err.message });
    return;
  }

  res.status(500).json({ error: supersetBody && Object.keys(supersetBody).length ? supersetBody : err?.message });
}
