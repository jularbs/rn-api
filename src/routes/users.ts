import express from "express";
import { authenticate, authorize } from "@/middleware";
import { getAllUsers, getUserById, createUser, updateUser, deleteUser, restoreUser } from "@/controllers/usersController";

const router = express.Router();

// BASIC CRUD OPERATIONS
// POST /v1/users - Register new user
router.post("/v1/users", authenticate, authorize("admin"), createUser);

// GET /v1/users - Get all users with pagination and filtering
router.get("/v1/users", authenticate, authorize("admin"), getAllUsers);

// GET /v1/users/:id - Get user by ID (Owner or Admin)
router.get("/v1/users/:id", authenticate, authorize("admin"), getUserById);

// PUT /v1/users/:id - Update user (Owner or Admin)
router.put("/v1/users/:id", authenticate, authorize("admin", "owner"), updateUser);

// DELETE /v1/users/:id - Delete user (soft delete) (Admin only)
router.delete("/v1/users/:id", authenticate, authorize("admin"), deleteUser);

// SPECIAL RESTful OPERATIONS
// POST /v1/users/:id/restore - Restore a soft deleted user (Admin only)
router.post("/v1/users/:id/restore", authenticate, authorize("admin"), restoreUser);

export default router;
