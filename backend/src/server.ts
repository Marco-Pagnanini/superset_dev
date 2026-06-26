import { createApp } from './app';
import { config } from './config/env';

const app = createApp();

app.listen(config.port, () => {
  console.log(`Backend Superset attivo su http://localhost:${config.port}`);
  console.log(`→ Superset target: ${config.superset.url}`);
  console.log(`→ Health check:    http://localhost:${config.port}/api/health`);
});
