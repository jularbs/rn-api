import express from "express";
import { authenticate } from "@/middleware/auth";
import { createRateLimiter } from "@/middleware";
import {
  register,
  login,
  logout,
  requestPasswordReset,
  resetPassword,
  changePassword,
  verifyEmail,
  resendEmailVerification,
} from "@/controllers/authController";

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

// POST /v1/auth/register - Register new user
router.post("/v1/auth/register", registerRateLimit, register);

// POST /v1/auth/login - Login user
router.post("/v1/auth/login", authRateLimit, login);

// POST /v1/auth/logout - Logout user
router.post("/v1/auth/logout", authenticate, logout);

//GET /v1/auth/validate - Validate if token is still valid
router.get("/v1/auth/validate", authenticate, (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Token is valid.",
  });
});

// POST /v1/auth/request-password-reset - Request password reset
router.post("/v1/auth/request-password-reset", authRateLimit, requestPasswordReset);

// POST /v1/auth/reset-password - Reset password using token
router.post("/v1/auth/reset-password", authRateLimit, resetPassword);

// PUT /v1/auth/change-password - Change password for logged-in users
router.put("/v1/auth/change-password", authenticate, authRateLimit, changePassword);

// GET /v1/auth/verify-email - Verify user's email address
router.get("/v1/auth/verify-email", authRateLimit, verifyEmail);

// POST /v1/auth/resend-verification - Resend email verification
router.post("/v1/auth/resend-verification", authRateLimit, resendEmailVerification);

export default router;
