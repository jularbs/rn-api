//TODOS: test error with url http://localhost:8000/api/v1/station/radio-station-two/slug
import { Router } from "express";
import { getAllStations, getStationById, getStationBySlug, createStation, updateStation, deleteStation, toggleStationStatus } from "@/controllers/stationsController";
import { authenticate, authorize } from "@/middleware/auth";

const router = Router();

// Public routes - no authentication required
router.get("/v1/station", getAllStations);
router.get("/v1/station/id/:id", getStationById);
router.get("/v1/station/:slug", getStationBySlug);

// Admin/Moderator only routes
router.post("/v1/station", authenticate, authorize("admin", "moderator"), createStation);
router.put("/v1/station/:id", authenticate, authorize("admin", "moderator"), updateStation);
router.patch("/v1/station/:id/status", authenticate, authorize("admin", "moderator"), toggleStationStatus);

// Admin only routes
router.delete("/v1/station/:id", authenticate, authorize("admin"), deleteStation);

export default router;
