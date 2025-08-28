const express = require('express');
const { authenticate, authorize, ownerOrAdmin } = require('../middleware');
const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    updateUserPassword,
    deleteUser,
    permanentlyDeleteUser,
    getUserStats,
    getDeletedUsers,
    restoreUser
} = require('../controllers/usersController');

const router = express.Router();

// POST /api/users - Create new user (Admin only)
router.post('/v1/users', authenticate, authorize('admin'), createUser);
// POST /api/users/:id/restore - Restore a soft deleted user (Admin only)
router.post('/v1/users/:id/restore', authenticate, authorize('admin'), restoreUser);

// GET /api/users - Get all users with pagination and filtering (Admin only)
router.get('/v1/users', authenticate, authorize('admin'), getAllUsers);
// GET /api/users/:id - Get user by ID (Owner or Admin)
router.get('/v1/users/:id', authenticate, ownerOrAdmin, getUserById);
// GET /api/users/stats/overview - Get user statistics (Admin only)
router.get('/v1/users/stats/overview', authenticate, authorize('admin'), getUserStats);
// GET /api/users/deleted - Get all soft deleted users (Admin only)
router.get('/v1/users/deleted', authenticate, authorize('admin'), getDeletedUsers);

// PUT /api/users/:id - Update user (Owner or Admin)
router.put('/v1/users/:id', authenticate, ownerOrAdmin, updateUser);

// PATCH /api/users/:id/password - Update user password (Admin only)
router.patch('/v1/users/:id/password', authenticate, authorize('admin'), updateUserPassword);

// DELETE /api/users/:id - Delete user (soft delete) (Admin only)
router.delete('/v1/users/:id', authenticate, authorize('admin'), deleteUser);
// DELETE /api/users/:id/permanent - Permanently delete user (Admin only)
router.delete('/v1/users/:id/permanent', authenticate, authorize('admin'), permanentlyDeleteUser);

module.exports = router;
