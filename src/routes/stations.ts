//TODOS: test error with url http://localhost:8000/api/v1/station/radio-station-two/slug
import { Router } from "express";
import {
  getAllStations,
  getStationById,
  getStationBySlug,
  createStation,
  updateStation,
  deleteStation,
  toggleStationStatus,
  getDefaultStation,
  setDefaultStation,
} from "@/controllers/stationsController";
import { authenticate, authorize, optionalAuth } from "@/middleware/auth";
import { ADMIN_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE } from "@/utils/constants";

const router = Router();

// Public routes - no authentication required
router.get("/v1/stations/id/:id", getStationById);
router.get("/v1/stations/default", getDefaultStation);
router.get("/v1/stations/:slug", getStationBySlug);


// Optionally protected routes
router.get("/v1/stations", optionalAuth, getAllStations);

// Admin/manager only routes
router.post(
  "/v1/stations",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  createStation
);
router.put(
  "/v1/stations/:id",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  updateStation
);

router.put(
  "/v1/stations/default/:id",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  setDefaultStation
);

router.patch(
  "/v1/stations/:id/status",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  toggleStationStatus
);

// Admin only routes
router.delete(
  "/v1/stations/:id",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  deleteStation
);

export default router;
