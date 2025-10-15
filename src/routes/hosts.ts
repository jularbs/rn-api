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
} from "@/controllers/hostController";
import { authenticate, authorize } from "@/middleware/auth";

const router = Router();

// Public routes
// GET /v1/hosts/search - Search hosts
router.get("/v1/hosts/search", searchHosts);

// GET /v1/hosts/slug/:slug - Get host by slug (public, active only)
router.get("/v1/hosts/slug/:slug", getHostBySlug);

// Protected routes - Admin and manager access
// GET /v1/hosts - Get all hosts with filtering
router.get("/v1/hosts", authenticate, authorize("admin", "manager"), getAllHosts);

// POST /v1/hosts - Create new host
router.post("/v1/hosts", authenticate, authorize("admin", "manager"), createHost);

// PATCH /v1/hosts/:id/add-program - Add program to host
router.patch(
  "/v1/hosts/:id/add-program",
  authenticate,
  authorize("admin", "manager"),
  addProgramToHost
);

// PATCH /v1/hosts/:id/remove-program - Remove program from host
router.patch(
  "/v1/hosts/:id/remove-program",
  authenticate,
  authorize("admin", "manager"),
  removeProgramFromHost
);

// PATCH /v1/hosts/:id/toggle-status - Toggle host status
router.patch(
  "/v1/hosts/:id/toggle-status",
  authenticate,
  authorize("admin", "manager"),
  toggleHostStatus
);

// PUT /v1/hosts/:id - Update host
router.put("/v1/hosts/:id", authenticate, authorize("admin", "manager"), updateHost);

// DELETE /v1/hosts/:id - Delete host
router.delete("/v1/hosts/:id", authenticate, authorize("admin"), deleteHost);

// GET /v1/hosts/:id - Get host by ID
router.get("/v1/hosts/:id", authenticate, authorize("admin", "manager"), getHostById);

export default router;
