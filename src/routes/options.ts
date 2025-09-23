import { Router } from "express";
import {
  getOptionByKey,
  createOrUpdateOption,
  deleteOption,
} from "@/controllers/optionsController";
import { authenticate, authorize } from "@/middleware/auth";

const router = Router();

// Admin/Moderator routes (specific routes first)
// POST /api/options - Create or update option
router.post("/", authenticate, authorize("admin", "moderator"), createOrUpdateOption);

// GET /api/options/:key - Get single option by key
router.get("/:key", getOptionByKey);

// DELETE /api/options/:key - Delete option by key
router.delete("/:key", authenticate, authorize("admin"), deleteOption);

export default router;
