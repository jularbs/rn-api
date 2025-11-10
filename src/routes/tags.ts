import { Router } from "express";
import {
  getAllTags,
  getPopularTags,
  getTrendingTags,
  getTagStats,
  getTagById,
  getTagBySlug,
  createTag,
  createTagsBatch,
  updateTag,
  deleteTag,
  incrementTagUsage,
  decrementTagUsage,
  bulkUpdateTagUsage,
  cleanupUnusedTags,
} from "@/controllers/tagsController";
import { authenticate, authorize } from "@/middleware/auth";
import {ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE} from "@/utils/constants";

const router = Router();

// Public routes - No authentication required
// GET /v1/tags - Get all tags with filtering and pagination
router.get("/v1/tags", getAllTags);

// GET /v1/tags/popular - Get popular tags
router.get("/v1/tags/popular", getPopularTags);

// GET /v1/tags/trending - Get trending tags
router.get("/v1/tags/trending", getTrendingTags);

// GET /v1/tags/slug/:slug - Get tag by slug
router.get("/v1/tags/slug/:slug", getTagBySlug);

// GET /v1/tags/:id - Get tag by ID
router.get("/v1/tags/:id", getTagById);

// Protected routes - Require authentication
// Admin/manager only routes
// POST /v1/tags - Create new tag
router.post(
  "/v1/tags/",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  createTag
);

// POST /v1/tags/batch - Create multiple tags
router.post(
  "/v1/tags/batch",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  createTagsBatch
);

// PUT /v1/tags/:id - Update tag by ID
router.put(
  "/v1/tags/:id",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  updateTag
);

// DELETE /v1/tags/:id - Delete tag by ID
router.delete(
  "/v1/tags/:id",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  deleteTag
);

// Analytics and statistics routes (admin only)
// GET /v1/tags/stats - Get tag statistics
router.get(
  "/v1/tags/stats",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  getTagStats
);

// DELETE /v1/tags/cleanup-unused - Cleanup unused tags
router.delete(
  "/v1/tags/cleanup-unused",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  cleanupUnusedTags
);

// Usage management routes (admin/manager)
// PATCH /v1/tags/:id/increment-usage - Increment tag usage count
router.patch(
  "/v1/tags/:id/increment-usage",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  incrementTagUsage
);

// PATCH /v1/tags/:id/decrement-usage - Decrement tag usage count
router.patch(
  "/v1/tags/:id/decrement-usage",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  decrementTagUsage
);

// POST /v1/tags/bulk-usage - Bulk update tag usage
router.post(
  "/v1/tags/bulk-usage",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  bulkUpdateTagUsage
);

export default router;
