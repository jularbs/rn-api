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
} from "../controllers/tagsController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Public routes - No authentication required
// GET /api/tags - Get all tags with filtering and pagination
router.get("/", getAllTags);

// GET /api/tags/popular - Get popular tags
router.get("/popular", getPopularTags);

// GET /api/tags/trending - Get trending tags
router.get("/trending", getTrendingTags);

// GET /api/tags/slug/:slug - Get tag by slug
router.get("/slug/:slug", getTagBySlug);

// GET /api/tags/:id - Get tag by ID
router.get("/:id", getTagById);

// Protected routes - Require authentication
// Admin/Moderator only routes
// POST /api/tags - Create new tag
router.post("/", authenticate, authorize("admin", "moderator"), createTag);

// POST /api/tags/batch - Create multiple tags
router.post("/batch", authenticate, authorize("admin", "moderator"), createTagsBatch);

// PUT /api/tags/:id - Update tag by ID
router.put("/:id", authenticate, authorize("admin", "moderator"), updateTag);

// DELETE /api/tags/:id - Delete tag by ID
router.delete("/:id", authenticate, authorize("admin"), deleteTag);

// Analytics and statistics routes (admin only)
// GET /api/tags/stats - Get tag statistics
router.get("/stats", authenticate, authorize("admin"), getTagStats);

// DELETE /api/tags/cleanup-unused - Cleanup unused tags
router.delete("/cleanup-unused", authenticate, authorize("admin"), cleanupUnusedTags);

// Usage management routes (admin/moderator)
// PATCH /api/tags/:id/increment-usage - Increment tag usage count
router.patch("/:id/increment-usage", authenticate, authorize("admin", "moderator"), incrementTagUsage);

// PATCH /api/tags/:id/decrement-usage - Decrement tag usage count
router.patch("/:id/decrement-usage", authenticate, authorize("admin", "moderator"), decrementTagUsage);

// POST /api/tags/bulk-usage - Bulk update tag usage
router.post("/bulk-usage", authenticate, authorize("admin", "moderator"), bulkUpdateTagUsage);

export default router;
