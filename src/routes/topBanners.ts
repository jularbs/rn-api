import { Router } from "express";
import {
  getAllTopBanners,
  getTopBannerById,
  getTopBannerBySlug,
  getActiveBanners,
  createTopBanner,
  updateTopBanner,
  deleteTopBanner,
  toggleBannerVisibility,
  incrementClicks,
  incrementImpressions,
  searchBanners,
} from "@/controllers/topBannerController";
import { authenticate, authorize } from "@/middleware/auth";

const router = Router();

// Public routes - No authentication required

// GET /api/top-banners/active - Get currently active banners (for public display)
router.get("/active", getActiveBanners);

// GET /api/top-banners/slug/:slug - Get banner by slug (public access)
router.get("/slug/:slug", getTopBannerBySlug);

// PATCH /api/top-banners/:id/increment-impressions - Track impressions (public)
router.patch("/:id/increment-impressions", incrementImpressions);

// PATCH /api/top-banners/:id/increment-clicks - Track clicks (public)
router.patch("/:id/increment-clicks", incrementClicks);

// Protected routes - Require authentication and authorization

// Admin/Moderator routes (specific routes first)
// GET /api/top-banners - Get all banners with filtering and pagination
router.get("/", authenticate, authorize("admin", "moderator"), getAllTopBanners);

// GET /api/top-banners/search - Search banners
router.get("/search", authenticate, authorize("admin", "moderator"), searchBanners);

// POST /api/top-banners - Create new banner
router.post("/", authenticate, authorize("admin", "moderator"), createTopBanner);

// Dynamic routes (must come after specific routes)
// GET /api/top-banners/:id - Get banner by ID
router.get("/:id", authenticate, authorize("admin", "moderator"), getTopBannerById);

// PUT /api/top-banners/:id - Update banner by ID
router.put("/:id", authenticate, authorize("admin", "moderator"), updateTopBanner);

// DELETE /api/top-banners/:id - Delete banner by ID
router.delete("/:id", authenticate, authorize("admin"), deleteTopBanner);

// PATCH /api/top-banners/:id/toggle-visibility - Toggle banner visibility
router.patch("/:id/toggle-visibility", authenticate, authorize("admin", "moderator"), toggleBannerVisibility);

export default router;
