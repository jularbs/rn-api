import { Router } from "express";
import {
  getAllPrograms,
  getProgramById,
  getProgramBySlug,
  createProgram,
  updateProgram,
  deleteProgram,
  toggleProgramStatus,
  getProgramsByDay,
  getCurrentlyAiringPrograms,
  getProgramsByStation,
  getWeeklySchedule,
  searchPrograms,
  findProgramConflicts,
} from "@/controllers/programsController";
import { authenticate, authorize } from "@/middleware/auth";
import { ADMIN_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE } from "@/utils/constants";

const router = Router();

// Public routes
// GET /v1/programs/search - Search programs
router.get("/v1/programs/search", searchPrograms);

// GET /v1/programs/slug/:slug - Get program by slug (public, active only)
router.get("/v1/programs/slug/:slug", getProgramBySlug);

// GET /v1/programs/schedule/day/:day - Get programs by day
router.get("/v1/programs/schedule/day/:day", getProgramsByDay);

// GET /v1/programs/schedule/now - Get currently airing programs
router.get("/v1/programs/schedule/now", getCurrentlyAiringPrograms);

// GET /v1/programs/schedule/station/:stationId - Get programs by station
router.get("/v1/programs/schedule/station/:stationId", getProgramsByStation);

// GET /v1/programs/schedule/weekly - Get weekly schedule
router.get("/v1/programs/schedule/weekly", getWeeklySchedule);

// GET /v1/programs/conflicts - Find time conflicts
router.get(
  "/v1/programs/conflicts",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  findProgramConflicts
);

// Protected routes - Admin and manager access
// GET /v1/programs - Get all programs with filtering
router.get(
  "/v1/programs",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  getAllPrograms
);

// POST /v1/programs - Create new program
router.post(
  "/v1/programs",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  createProgram
);

// PATCH /v1/programs/:id/toggle-status - Toggle program status
router.patch(
  "/v1/programs/:id/toggle-status",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  toggleProgramStatus
);

// PUT /v1/programs/:id - Update program
router.put(
  "/v1/programs/:id",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  updateProgram
);

// DELETE /v1/programs/:id - Delete program
router.delete(
  "/v1/programs/:id",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  deleteProgram
);

// GET /v1/programs/:id - Get program by ID
router.get(
  "/v1/programs/:id",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  getProgramById
);

export default router;
