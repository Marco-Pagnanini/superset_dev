import { Router } from 'express';
import * as ctrl from '../controllers/chart.controller';

const router = Router();

router.get('/', ctrl.list);
router.get('/:id/data', ctrl.data);

export default router;
