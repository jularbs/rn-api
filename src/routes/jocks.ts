import { Router } from "express";
import {
  getAllJocks,
  getJockById,
  getJockBySlug,
  createJock,
  updateJock,
  deleteJock,
  toggleJockStatus,
  addProgramToJock,
  removeProgramFromJock,
  searchJocks,
} from "@/controllers/jocksController";
import { authenticate, authorize } from "@/middleware/auth";

const router = Router();

// Public routes
// GET /v1/jocks/search - Search jocks
router.get("/v1/jocks/search", searchJocks);

// GET /v1/jocks/slug/:slug - Get jock by slug (public, active only)
router.get("/v1/jocks/slug/:slug", getJockBySlug);

// Protected routes - Admin and manager access
// GET /v1/jocks - Get all jocks with filtering
router.get("/v1/jocks", authenticate, authorize("admin", "manager"), getAllJocks);

// POST /v1/jocks - Create new jock
router.post("/v1/jocks", authenticate, authorize("admin", "manager"), createJock);

// PATCH /v1/jocks/:id/add-program - Add program to jock
router.patch(
  "/v1/jocks/:id/add-program",
  authenticate,
  authorize("admin", "manager"),
  addProgramToJock
);

// PATCH /v1/jocks/:id/remove-program - Remove program from jock
router.patch(
  "/v1/jocks/:id/remove-program",
  authenticate,
  authorize("admin", "manager"),
  removeProgramFromJock
);

// PATCH /v1/jocks/:id/toggle-status - Toggle jock status
router.patch(
  "/v1/jocks/:id/toggle-status",
  authenticate,
  authorize("admin", "manager"),
  toggleJockStatus
);

// PUT /v1/jocks/:id - Update jock
router.put("/v1/jocks/:id", authenticate, authorize("admin", "manager"), updateJock);

// DELETE /v1/jocks/:id - Delete jock
router.delete("/v1/jocks/:id", authenticate, authorize("admin"), deleteJock);

// GET /v1/jocks/:id - Get jock by ID
router.get("/v1/jocks/:id", authenticate, authorize("admin", "manager"), getJockById);

export default router;
