import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

/**
 * Crea e configura l'app Express.
 * Tutte le route applicative sono montate sotto `/api`.
 */
export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  app.use('/api', routes);

  // Error handler centralizzato: deve essere registrato per ultimo.
  app.use(errorHandler);

  return app;
}
