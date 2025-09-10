import { Router } from "express";
import {
  getAllHosts,
  getHostById,
  getHostBySlug,
  createHost,
  updateHost,
  deleteHost,
  toggleHostStatus,
  addProgramToHost,
  removeProgramFromHost,
  searchHosts,
} from "../controllers/hostController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Public routes
// GET /api/hosts/search - Search hosts
router.get("/search", searchHosts);

// GET /api/hosts/slug/:slug - Get host by slug (public, active only)
router.get("/slug/:slug", getHostBySlug);

// Protected routes - Admin and Moderator access
// GET /api/hosts - Get all hosts with filtering
router.get("/", authenticate, authorize("admin", "moderator"), getAllHosts);

// POST /api/hosts - Create new host
router.post("/", authenticate, authorize("admin", "moderator"), createHost);

// PATCH /api/hosts/:id/add-program - Add program to host
router.patch(
  "/:id/add-program",
  authenticate,
  authorize("admin", "moderator"),
  addProgramToHost
);

// PATCH /api/hosts/:id/remove-program - Remove program from host
router.patch(
  "/:id/remove-program",
  authenticate,
  authorize("admin", "moderator"),
  removeProgramFromHost
);

// PATCH /api/hosts/:id/toggle-status - Toggle host status
router.patch(
  "/:id/toggle-status",
  authenticate,
  authorize("admin", "moderator"),
  toggleHostStatus
);

// PUT /api/hosts/:id - Update host
router.put("/:id", authenticate, authorize("admin", "moderator"), updateHost);

// DELETE /api/hosts/:id - Delete host
router.delete("/:id", authenticate, authorize("admin"), deleteHost);

// GET /api/hosts/:id - Get host by ID
router.get("/:id", authenticate, authorize("admin", "moderator"), getHostById);

export default router;
