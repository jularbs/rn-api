import { Router } from 'express';
import {
  getAllStations,
  getStationById,
  getStationBySlug,
  createStation,
  updateStation,
  deleteStation,
  toggleStationStatus
} from '../controllers/stationsController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public routes - no authentication required
router.get('/', getAllStations);
router.get('/slug/:slug', getStationBySlug);
router.get('/:id', getStationById);

// Protected routes - authentication required
router.use(authenticate);

// Admin/Moderator only routes
router.post('/', authorize('admin', 'moderator'), createStation);
router.put('/:id', authorize('admin', 'moderator'), updateStation);
router.patch('/:id/status', authorize('admin', 'moderator'), toggleStationStatus);

// Admin only routes
router.delete('/:id', authorize('admin'), deleteStation);

export default router;
