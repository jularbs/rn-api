import express from "express";
import { authenticate, authorize, optionalAuth } from "@/middleware";
import {
  getAllRecepients,
  getRecepientById,
  createRecepient,
  updateRecepient,
  deleteRecepient,
  restoreRecepient,
  toggleRecepientStatus,
  permanentDeleteRecepient,
} from "@/controllers/recepientsController";
import { ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE } from "@/utils/constants";

const router = express.Router();

// BASIC CRUD OPERATIONS
// POST /v1/recepients - Create new recepient
router.post("/v1/recepients", authenticate, authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE), createRecepient);

// GET /v1/recepients - Get all recepients with pagination and filtering
router.get("/v1/recepients", optionalAuth, getAllRecepients);

// GET /v1/recepients/:id - Get recepient by ID
router.get(
  "/v1/recepients/:id",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE),
  getRecepientById
);

// PUT /v1/recepients/:id - Update recepient
router.put(
  "/v1/recepients/:id",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE),
  updateRecepient
);

// DELETE /v1/recepients/:id - Delete recepient (soft delete)
router.delete("/v1/recepients/:id", authenticate, authorize(ADMIN_ROLE), deleteRecepient);

// SPECIAL RESTful OPERATIONS
// POST /v1/recepients/:id/restore - Restore a soft deleted recepient
router.post("/v1/recepients/:id/restore", authenticate, authorize(ADMIN_ROLE), restoreRecepient);

// PUT /v1/recepients/:id/toggle-status - Toggle recepient active status
router.put(
  "/v1/recepients/:id/toggle-status",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE),
  toggleRecepientStatus
);

// DELETE /v1/recepients/:id/permanent - Permanently delete recepient
router.delete("/v1/recepients/:id/permanent", authenticate, authorize(ADMIN_ROLE), permanentDeleteRecepient);

export default router;
