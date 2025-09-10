import express from "express";
import { authenticate } from "../middleware/auth";
import { createRateLimiter } from "../middleware";
import { register, login, logout, requestPasswordReset } from "../controllers/authController";

const router = express.Router();

// Rate limiting for auth endpoints
const authRateLimit = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 5,
  message: "Too many failed login attempts. Please try again after 5 minutes.",
}); // 5 attempts per 15 minutes

const registerRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  message: "Too many failed registration attempts. Please try again in an hour.",
  skipSuccessfulRequests: true,
}); // 10 registrations per hour

// POST /api/auth/register - Register new user
router.post("/v1/auth/register", registerRateLimit, register);

// POST /api/auth/login - Login user
router.post("/v1/auth/login", authRateLimit, login);

// POST /api/auth/logout - Logout user
router.post("/v1/auth/logout", authenticate, logout);

// POST /api/auth/request-password-reset - Request password reset
router.post("/v1/auth/request-password-reset", authRateLimit, requestPasswordReset);

export default router;
