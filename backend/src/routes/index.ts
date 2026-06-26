import { Router } from 'express';
import dashboardRoutes from './dashboard.routes';
import chartRoutes from './chart.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

router.use('/dashboards', dashboardRoutes);
router.use('/charts', chartRoutes);

export default router;
