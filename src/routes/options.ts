import { Router } from "express";
import { getOptionByKey, createOrUpdateOption, deleteOption } from "@/controllers/optionsController";
import { authenticate, authorize } from "@/middleware/auth";
import { ADMIN_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE } from "@/utils/constants";

const router = Router();

// Admin/manager routes (specific routes first)
// POST /v1/options - Create or update option
router.post(
  "/v1/options",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  createOrUpdateOption
);

// GET /v1/options/:key - Get single option by key
router.get("/v1/options/:key", getOptionByKey);

// DELETE /v1/options/:key - Delete option by key
router.delete(
  "/v1/options/:key",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  deleteOption
);

export default router;
