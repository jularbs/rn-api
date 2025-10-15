//TODOS: test error with url http://localhost:8000/api/v1/station/radio-station-two/slug
import { Router } from "express";
import { getAllStations, getStationById, getStationBySlug, createStation, updateStation, deleteStation, toggleStationStatus } from "@/controllers/stationsController";
import { authenticate, authorize } from "@/middleware/auth";

const router = Router();

// Public routes - no authentication required
router.get("/v1/stations", getAllStations);
router.get("/v1/stations/id/:id", getStationById);
router.get("/v1/stations/:slug", getStationBySlug);

// Admin/manager only routes
router.post("/v1/stations", authenticate, authorize("admin", "manager"), createStation);
router.put("/v1/stations/:id", authenticate, authorize("admin", "manager"), updateStation);
router.patch("/v1/stations/:id/status", authenticate, authorize("admin", "manager"), toggleStationStatus);

// Admin only routes
router.delete("/v1/stations/:id", authenticate, authorize("admin"), deleteStation);

export default router;
