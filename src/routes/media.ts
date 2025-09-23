import { Router } from "express";
import { authenticate, authorize } from "@/middleware/auth";
import {
  getAllMedia,
  getMediaByKey,
  deleteMedia,
  getMediaByType,
} from "@/controllers/mediaController";

const router = Router();

// Public routes for media access
router.get("/key/:key", getMediaByKey); // Get media by S3 key (public access for displaying)

// Protected routes (authentication required)
router.get("/", authenticate, getAllMedia);
router.get("/types/:type", authenticate, getMediaByType);

// Admin/Moderator only routes
router.delete("/:id", authenticate, authorize("admin", "moderator"), deleteMedia);

export default router;
