import { Router } from 'express';
import { authenticate, authorize } from '@/middleware/auth';
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  incrementViews,
  publishPost,
  getPublishedPosts,
  getFeaturedPosts,
  getBreakingNews,
  getPostsByCategory,
  getPostsByAuthor,
  searchPosts,
  getRelatedPosts,
  getMostViewedPosts,
  getTrendingPosts,
  getPostStats,
  getScheduledPosts
} from '@/controllers/postsController';

const router = Router();

// Public routes
router.get("/v1/posts/v1/posts/published", getPublishedPosts);
router.get("/v1/posts/featured", getFeaturedPosts);
router.get("/v1/posts/breaking", getBreakingNews);
router.get("/v1/posts/trending", getTrendingPosts);
router.get("/v1/posts/most-viewed", getMostViewedPosts);
router.get("/v1/posts/search", searchPosts);
router.get("/v1/posts/category/:categoryId", getPostsByCategory);
router.get("/v1/posts/author/:authorId", getPostsByAuthor);
router.get("/v1/posts/:id/related", getRelatedPosts);
router.post("/v1/posts/:id/views", incrementViews);

// Admin/Moderator routes
router.get("/v1/posts/stats", authenticate, authorize("admin", "moderator"), getPostStats);
router.get("/v1/posts/scheduled", authenticate, authorize("admin", "moderator"), getScheduledPosts);
router.get("/v1/posts/", authenticate, authorize("admin", "moderator"), getPosts);
router.post("/v1/posts/", authenticate, authorize("admin", "moderator"), createPost);
router.put("/v1/posts/:id", authenticate, authorize("admin", "moderator"), updatePost);
router.delete("/v1/posts/:id", authenticate, authorize("admin", "moderator"), deletePost);
router.patch("/v1/posts/:id/publish", authenticate, authorize("admin", "moderator"), publishPost);

// This should be last as it's a catch-all for ID/slug
router.get("/v1/posts/:id", getPost);

export default router;
