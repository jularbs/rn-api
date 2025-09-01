import { Router } from "express";
import {
  getAllCategories,
  getCategoryTree,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  reorderCategories,
} from "../controllers/categoriesController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Public routes - no authentication required
router.get("/v1/category", getAllCategories);
router.get("/v1/category/tree", getCategoryTree);
router.get("/v1/category/id/:id", getCategoryById);
router.get("/v1/category/:slug", getCategoryBySlug);

// Admin/Moderator only routes
router.post(
  "/v1/category",
  authenticate,
  authorize("admin", "moderator"),
  createCategory
);

router.put(
  "/v1/category/:id",
  authenticate,
  authorize("admin", "moderator"),
  updateCategory
);

router.delete(
  "/v1/category/:id",
  authenticate,
  authorize("admin", "moderator"),
  deleteCategory
);

router.patch(
  "/v1/category/:id/status",
  authenticate,
  authorize("admin", "moderator"),
  toggleCategoryStatus
);

router.post(
  "/v1/category/reorder",
  authenticate,
  authorize("admin", "moderator"),
  reorderCategories
);

export default router;
