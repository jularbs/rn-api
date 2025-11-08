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
import { ADMIN_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE } from "@/utils/constants";

const router = Router();

// Public routes - authentication optional
router.get("/v1/categories", optionalAuth, getCategories);
router.get("/v1/categories/id/:id", optionalAuth, getCategoryById);
router.get("/v1/categories/:slug", getCategoryBySlug);

// Admin/manager only routes
router.post("/v1/categories", authenticate, authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE), createCategory);
router.put("/v1/categories/:id", authenticate, authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE), updateCategory);
router.delete("/v1/categories/:id", authenticate, authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE), deleteCategory);
router.patch("/v1/categories/:id/status", authenticate, authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE), toggleCategoryStatus);
router.post("/v1/categories/reorder", authenticate, authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE), reorderCategories);

export default router;