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

// GET /api/users - Get all users with pagination and filtering (Admin only)
router.get('/', authenticate, authorize('admin'), getAllUsers);

// GET /api/users/:id - Get user by ID (Owner or Admin)
router.get('/:id', authenticate, ownerOrAdmin, getUserById);

// POST /api/users - Create new user (Admin only)
router.post('/', authenticate, authorize('admin'), createUser);

// PUT /api/users/:id - Update user (Owner or Admin)
router.put('/:id', authenticate, ownerOrAdmin, updateUser);

// PATCH /api/users/:id/password - Update user password (Admin only)
router.patch('/:id/password', authenticate, authorize('admin'), updateUserPassword);

// DELETE /api/users/:id - Delete user (soft delete) (Admin only)
router.delete('/:id', authenticate, authorize('admin'), deleteUser);

// DELETE /api/users/:id/permanent - Permanently delete user (Admin only)
router.delete('/:id/permanent', authenticate, authorize('admin'), permanentlyDeleteUser);

// GET /api/users/stats/overview - Get user statistics (Admin only)
router.get('/stats/overview', authenticate, authorize('admin'), getUserStats);

// GET /api/users/deleted - Get all soft deleted users (Admin only)
router.get('/deleted', authenticate, authorize('admin'), getDeletedUsers);

// POST /api/users/:id/restore - Restore a soft deleted user (Admin only)
router.post('/:id/restore', authenticate, authorize('admin'), restoreUser);

module.exports = router;
