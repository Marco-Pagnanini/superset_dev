import { Router } from 'express';
import * as ctrl from '../controllers/dashboard.controller';

const router = Router();

router.get('/', ctrl.list);
router.post('/guest-token', ctrl.guestToken);
router.post('/build', ctrl.build);

router.get('/:id/charts', ctrl.charts);
router.get('/:id/native-filters', ctrl.nativeFilters);
router.post('/:id/set-filter-default', ctrl.setFilterDefaultCtrl);
router.post('/:id/permalink', ctrl.permalink);
router.get('/:id/filter-state', ctrl.getFilterStateCtrl);
router.post('/:id/filter-state', ctrl.saveFilterStateCtrl);
router.get('/:id/filter-options/:filterId', ctrl.filterOptions);
router.post('/:id/screenshot', ctrl.requestScreenshot);
router.get('/:id/screenshot/:digest/pdf', ctrl.downloadPdf);

export default router;
