import express from 'express';
import { authenticate } from '../middleware/auth';
import { createRateLimiter } from '../middleware';
import {
  register,
  login,
  getProfile,
  updateProfile,
  logout
} from '../controllers/authController';

const router = express.Router();

// Rate limiting for auth endpoints
const authRateLimit = createRateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 minutes
const registerRateLimit = createRateLimiter(60 * 60 * 1000, 3); // 3 registrations per hour

// POST /api/auth/register - Register new user
router.post('/register', registerRateLimit, register);

// POST /api/auth/login - Login user
router.post('/login', authRateLimit, login);

// GET /api/auth/me - Get current user profile
router.get('/me', authenticate, getProfile);

// PUT /api/auth/me - Update current user profile
router.put('/me', authenticate, updateProfile);

// POST /api/auth/logout - Logout user
router.post('/logout', authenticate, logout);

export default router;
