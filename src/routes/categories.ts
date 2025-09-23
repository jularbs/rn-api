import { Router } from "express";
import {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  reorderCategories,
} from "@/controllers/categoriesController";
import { authenticate, authorize, optionalAuth } from "@/middleware/auth";

const router = Router();

// Public routes - authentication optional
router.get("/v1/categories", optionalAuth, getCategories);
router.get("/v1/categories/id/:id", optionalAuth, getCategoryById);
router.get("/v1/categories/:slug", getCategoryBySlug);

// Admin/Moderator only routes
router.post("/v1/categories", authenticate, authorize("admin", "moderator"), createCategory);
router.put("/v1/categories/:id", authenticate, authorize("admin", "moderator"), updateCategory);
router.delete("/v1/categories/:id", authenticate, authorize("admin", "moderator"), deleteCategory);
router.patch("/v1/categories/:id/status", authenticate, authorize("admin", "moderator"), toggleCategoryStatus);
router.post("/v1/categories/reorder", authenticate, authorize("admin", "moderator"), reorderCategories);

export default router;