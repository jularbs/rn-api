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
router.get('/published', getPublishedPosts);
router.get('/featured', getFeaturedPosts);
router.get('/breaking', getBreakingNews);
router.get('/trending', getTrendingPosts);
router.get('/most-viewed', getMostViewedPosts);
router.get('/search', searchPosts);
router.get('/category/:categoryId', getPostsByCategory);
router.get('/author/:authorId', getPostsByAuthor);
router.get('/:id/related', getRelatedPosts);
router.post('/:id/views', incrementViews);

// Admin/Moderator routes
router.get('/stats', authenticate, authorize('admin', 'moderator'), getPostStats);
router.get('/scheduled', authenticate, authorize('admin', 'moderator'), getScheduledPosts);
router.get('/', authenticate, authorize('admin', 'moderator'), getPosts);
router.post('/', authenticate, authorize('admin', 'moderator'), createPost);
router.put('/:id', authenticate, authorize('admin', 'moderator'), updatePost);
router.delete('/:id', authenticate, authorize('admin', 'moderator'), deletePost);
router.patch('/:id/publish', authenticate, authorize('admin', 'moderator'), publishPost);

// This should be last as it's a catch-all for ID/slug
router.get('/:id', getPost);

export default router;
