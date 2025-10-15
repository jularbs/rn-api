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

// Admin/manager only routes
router.post("/v1/categories", authenticate, authorize("admin", "manager"), createCategory);
router.put("/v1/categories/:id", authenticate, authorize("admin", "manager"), updateCategory);
router.delete("/v1/categories/:id", authenticate, authorize("admin", "manager"), deleteCategory);
router.patch("/v1/categories/:id/status", authenticate, authorize("admin", "manager"), toggleCategoryStatus);
router.post("/v1/categories/reorder", authenticate, authorize("admin", "manager"), reorderCategories);

export default router;