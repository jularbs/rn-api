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
import { authenticate, authorize, optionalAuth } from "@/middleware/auth";
import { ADMIN_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE } from "@/utils/constants";

const router = Router();

// Public routes
// GET /v1/jocks/search - Search jocks
router.get("/v1/jocks/search", searchJocks);

//Optional Routes
// GET /v1/jocks - Get all jocks with filtering
router.get("/v1/jocks", optionalAuth, getAllJocks);

// Protected routes - Admin and manager access
// POST /v1/jocks - Create new jock
router.post(
  "/v1/jocks",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  createJock
);

// PATCH /v1/jocks/:id/add-program - Add program to jock
router.patch(
  "/v1/jocks/:id/add-program",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  addProgramToJock
);

// PATCH /v1/jocks/:id/remove-program - Remove program from jock
router.patch(
  "/v1/jocks/:id/remove-program",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  removeProgramFromJock
);

// PATCH /v1/jocks/:id/toggle-status - Toggle jock status
router.patch(
  "/v1/jocks/:id/toggle-status",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  toggleJockStatus
);

// PUT /v1/jocks/:id - Update jock
router.put(
  "/v1/jocks/:id",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  updateJock
);

// DELETE /v1/jocks/:id - Delete jock
router.delete(
  "/v1/jocks/:id",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  deleteJock
);

// GET /v1/jocks/:id - Get jock by ID
router.get(
  "/v1/jocks/id/:id",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  getJockById
);

// GET /v1/jocks/slug/:slug - Get jock by slug (public, active only)
router.get("/v1/jocks/:slug", getJockBySlug);

export default router;
