import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  getAllMedia,
  getMediaById,
  getMediaByKey,
  createMedia,
  updateMedia,
  deleteMedia,
  searchMedia,
  getMediaByType,
  getMediaByBucket,
  getBasicStats,
  getFileTypeStats,
  getBucketStats,
} from "../controllers/mediaController";

const router = Router();

// Public routes for media access
router.get("/key/:key", getMediaByKey); // Get media by S3 key (public access for displaying)

// Protected routes (authentication required)
router.get("/", authenticate, getAllMedia);
router.get("/search", authenticate, searchMedia);
router.get("/types/:type", authenticate, getMediaByType);
router.get("/bucket/:bucket", authenticate, getMediaByBucket);
router.get("/stats/basic", authenticate, getBasicStats);
router.get("/stats/file-types", authenticate, getFileTypeStats);
router.get("/stats/buckets", authenticate, getBucketStats);
router.get("/:id", authenticate, getMediaById);

// Admin/Moderator only routes
router.post("/", authenticate, authorize("admin", "moderator"), createMedia);
router.put("/:id", authenticate, authorize("admin", "moderator"), updateMedia);
router.delete("/:id", authenticate, authorize("admin", "moderator"), deleteMedia);

export default router;
