import { Router } from "express";
import { authenticate, authorize } from "@/middleware/auth";
import {
  getAllMedia,
  getMediaByKey,
  deleteMedia,
  getMediaByType,
  uploadMediaFromEditor,
} from "@/controllers/mediaController";
import { ADMIN_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE } from "@/utils/constants";

const router = Router();

// Public routes for media access
router.get("/v1/media/key/:key", getMediaByKey); // Get media by S3 key (public access for displaying)

// Protected routes (authentication required)
router.get("/v1/media", authenticate, getAllMedia);
router.get("/v1/media/types/:type", authenticate, getMediaByType);
router.post("/v1/media/upload", authenticate, uploadMediaFromEditor);

// Admin/manager only routes
router.delete("/v1/media/:id", authenticate, authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE), deleteMedia);

export default router;
