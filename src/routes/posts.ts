//TODOS: Reduce redundancy in routes like /v1/posts/v1/posts/published
import { Router } from "express";
import { authenticate, authorize, optionalAuth } from "@/middleware/auth";
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  incrementViews,
  getRelatedPosts,
  getTrendingPosts,
  getPostStats,
} from "@/controllers/postsController";
import { ADMIN_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE } from "@/utils/constants";

const router = Router();

// Public routes

router.get("/v1/posts/trending", getTrendingPosts);
router.get("/v1/posts/:id/related", getRelatedPosts);
router.post("/v1/posts/:id/views", incrementViews);

//Optionally protected routes
router.get("/v1/posts", optionalAuth, getPosts);

// Protected Routes
router.get(
  "/v1/posts/stats",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  getPostStats
);

router.post(
  "/v1/posts",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  createPost
);
router.put(
  "/v1/posts/:id",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  updatePost
);
router.delete(
  "/v1/posts/:id",
  authenticate,
  authorize(ADMIN_ROLE, MANAGER_ROLE, MANAGING_EDITOR_ROLE, DIGITAL_CONTENT_PRODUCER_ROLE),
  deletePost
);

// This should be last as it's a catch-all for ID/slug
router.get("/v1/posts/:id", optionalAuth, getPost);

export default router;
