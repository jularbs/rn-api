import express from "express";
import { authenticate, authorize } from "../middleware";
import { getAllUsers, getUserById, createUser, updateUser, deleteUser, restoreUser } from "../controllers/usersController";

const router = express.Router();

// BASIC CRUD OPERATIONS
// POST /api/users - Register new user
router.post("/v1/user", authenticate, authorize("admin"), createUser);

// GET /api/users - Get all users with pagination and filtering
router.get("/v1/user", authenticate, authorize("admin"), getAllUsers);

// GET /api/users/:id - Get user by ID (Owner or Admin)
router.get("/v1/user/:id", authenticate, authorize("admin"), getUserById);

// PUT /api/users/:id - Update user (Owner or Admin)
router.put("/v1/user/:id", authenticate, authorize("admin", "owner"), updateUser);

// DELETE /api/users/:id - Delete user (soft delete) (Admin only)
router.delete("/v1/user/:id", authenticate, authorize("admin"), deleteUser);

// SPECIAL RESTful OPERATIONS
// POST /api/users/:id/restore - Restore a soft deleted user (Admin only)
router.post("/v1/user/:id/restore", authenticate, authorize("admin"), restoreUser);

export default router;
