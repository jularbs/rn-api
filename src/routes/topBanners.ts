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

// GET /v1/top-banners/active - Get currently active banners (for public display)
router.get("/v1/top-banners/active", getActiveBanners);

// GET /v1/top-banners/slug/:slug - Get banner by slug (public access)
router.get("/v1/top-banners/slug/:slug", getTopBannerBySlug);

// PATCH /v1/top-banners/:id/increment-impressions - Track impressions (public)
router.patch("/v1/top-banners/:id/increment-impressions", incrementImpressions);

// PATCH /v1/top-banners/:id/increment-clicks - Track clicks (public)
router.patch("/v1/top-banners/:id/increment-clicks", incrementClicks);

// Protected routes - Require authentication and authorization

// Admin/Moderator routes (specific routes first)
// GET /v1/top-banners - Get all banners with filtering and pagination
router.get("/v1/top-banners", authenticate, authorize("admin", "moderator"), getAllTopBanners);

// GET /v1/top-banners/search - Search banners
router.get("/v1/top-banners/search", authenticate, authorize("admin", "moderator"), searchBanners);

// POST /v1/top-banners - Create new banner
router.post("/v1/top-banners", authenticate, authorize("admin", "moderator"), createTopBanner);

// Dynamic routes (must come after specific routes)
// GET /v1/top-banners/:id - Get banner by ID
router.get("/v1/top-banners/:id", authenticate, authorize("admin", "moderator"), getTopBannerById);

// PUT /v1/top-banners/:id - Update banner by ID
router.put("/v1/top-banners/:id", authenticate, authorize("admin", "moderator"), updateTopBanner);

// DELETE /v1/top-banners/:id - Delete banner by ID
router.delete("/v1/top-banners/:id", authenticate, authorize("admin"), deleteTopBanner);

// PATCH /v1/top-banners/:id/toggle-visibility - Toggle banner visibility
router.patch("/v1/top-banners/:id/toggle-visibility", authenticate, authorize("admin", "moderator"), toggleBannerVisibility);

export default router;
