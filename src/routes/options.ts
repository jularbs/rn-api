import { Router } from "express";
import {
  getAllOptions,
  getOptionByKey,
  createOrUpdateOption,
  updateOption,
  deleteOption,
  bulkUpdateOptions,
  searchOptions,
} from "../controllers/optionsController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Protected routes - Require authentication and authorization

// Admin/Moderator routes (specific routes first)
// GET /api/options - Get all options with filtering and pagination
router.get("/", authenticate, authorize("admin", "moderator"), getAllOptions);

// GET /api/options/search - Search options
router.get("/search", authenticate, authorize("admin", "moderator"), searchOptions);

// POST /api/options - Create or update option
router.post("/", authenticate, authorize("admin", "moderator"), createOrUpdateOption);

// POST /api/options/bulk - Bulk update options
router.post("/bulk", authenticate, authorize("admin"), bulkUpdateOptions);

// Dynamic routes (must come after specific routes)
// GET /api/options/:key - Get single option by key
router.get("/:key", getOptionByKey);

// PUT /api/options/:key - Update option by key
router.put("/:key", authenticate, authorize("admin", "moderator"), updateOption);

// DELETE /api/options/:key - Delete option by key
router.delete("/:key", authenticate, authorize("admin"), deleteOption);

export default router;
