import { Router } from "express";
import {
  getOptionByKey,
  createOrUpdateOption,
  deleteOption,
} from "@/controllers/optionsController";
import { authenticate, authorize } from "@/middleware/auth";

const router = Router();

// Admin/manager routes (specific routes first)
// POST /v1/options - Create or update option
router.post("/v1/options", authenticate, authorize("admin", "manager"), createOrUpdateOption);

// GET /v1/options/:key - Get single option by key
router.get("/v1/options/:key", getOptionByKey);

// DELETE /v1/options/:key - Delete option by key
router.delete("/v1/options/:key", authenticate, authorize("admin"), deleteOption);

export default router;
