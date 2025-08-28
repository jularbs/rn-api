//TODOS: Apply middleware for authentication and authorization for certain routes
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

//BASIC CRUD OPERATIONS
// POST /api/users - Register new user
router.post('/v1/user', createUser);
// GET /api/users - Get all users with pagination and filtering
router.get('/v1/user', getAllUsers);
// GET /api/users/:id - Get user by ID (Owner or Admin)
router.get('/v1/user/:id', getUserById);
// PUT /api/users/:id - Update user (Owner or Admin)
router.patch('/v1/user/:id', updateUser);
// DELETE /api/users/:id - Delete user (soft delete) (Admin only)
router.delete('/v1/user/:id', deleteUser);

//SPECIAL RESTful OPERATIONS
// POST /api/users/:id/restore - Restore a soft deleted user (Admin only)
router.post('/v1/user/:id/restore', authenticate, authorize('admin'), restoreUser);
// GET /api/users/stats/overview - Get user statistics (Admin only)
router.get('/v1/user/stats/overview', authenticate, authorize('admin'), getUserStats);
// GET /api/users/deleted - Get all soft deleted users (Admin only)
router.get('/v1/user/deleted', authenticate, authorize('admin'), getDeletedUsers);
// PATCH /api/users/:id/password - Update user password (Admin only)
router.patch('/v1/user/:id/password', authenticate, authorize('admin'), updateUserPassword);
// DELETE /api/users/:id/permanent - Permanently delete user (Admin only)
router.delete('/v1/user/:id/permanent', authenticate, authorize('admin'), permanentlyDeleteUser);

module.exports = router;
