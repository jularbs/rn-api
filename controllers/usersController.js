const User = require('../models/User');

//BASIC CRUD OPERATIONS

// POST /api/users - Create new user
const createUser = async (req, res) => {
    try {
        const userData = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create new user
        const user = new User(userData);
        await user.save();

        // Return user without sensitive information
        const userResponse = await User.findById(user._id)
            .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires');

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: userResponse
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating user',
            error: error.message
        });
    }
};

// GET /api/users/:id - Get user by ID (Owner or Admin)
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id)
            .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error fetching user',
            error: error.message
        });
    }
};

// GET /api/users - Get all users with pagination and filtering (Admin only)
const getAllUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            role,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build query object
        const query = { deletedAt: { $ne: null } }; // Explicitly exclude soft deleted users

        if (role) query.role = role;

        // Search across name and email
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (page - 1) * limit;
        const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        // Execute query with pagination
        const users = await User.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))

        // Get total count for pagination info
        const total = await User.countDocuments(query);
        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            data: users,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalUsers: total,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: error.message
        });
    }
};

// PATCH /api/users/:id - Update user (Owner or Admin)
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Remove sensitive fields that shouldn't be updated this way
        delete updateData.password;
        delete updateData.emailVerificationToken;
        delete updateData.passwordResetToken;
        delete updateData.passwordResetExpires;

        // Check if email is being updated and if it already exists
        if (updateData.email) {
            const existingUser = await User.findOne({
                email: updateData.email,
                _id: { $ne: id }
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User with this email already exists'
                });
            }
        }

        const user = await User.findByIdAndUpdate(
            id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        ).select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User updated successfully',
            data: user
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error updating user',
            error: error.message
        });
    }
};

// DELETE /api/users/:id - Delete user (soft delete) (Admin only)
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        //TODOS: Store user who deleted
        // const deletedBy = req.user._id || null; // Get the admin user who is performing the deletion

        const user = await User.findById(id);
        console.log('User to be deleted:', user);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.deletedAt !== null) {
            return res.status(400).json({
                success: false,
                message: 'User is already deleted'
            });
        }

        // Perform soft delete using the model method
        await user.softDelete();

        res.json({
            success: true,
            message: 'User deleted successfully',
            data: {
                id: user._id,
                deletedAt: user.deletedAt,
            }
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error deleting user',
            error: error.message
        });
    }
};

//SECIAL OPERATIONS

// PATCH /api/users/:id/password - Update user password (Admin only)
const updateUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }

        // Get user with password
        const user = await User.findById(id).select('+password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check current password
        const isValidPassword = await user.comparePassword(currentPassword);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating password',
            error: error.message
        });
    }
};

// DELETE /api/users/:id/permanent - Permanently delete user (Admin only)
const permanentlyDeleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.forceDelete(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User permanently deleted',
            data: {
                id: user._id,
                email: user.email,
                fullName: user.fullName
            }
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error permanently deleting user',
            error: error.message
        });
    }
};

// GET /api/users/stats/overview - Get user statistics (Admin only)
const getUserStats = async (req, res) => {
    try {
        // Get stats including soft deleted users
        const stats = await User.findWithDeleted().aggregate([
            {
                $group: {
                    _id: null,
                    totalUsers: {
                        $sum: { $cond: [{ $eq: ['$deletedAt', null] }, 1, 0] }
                    },
                    deletedUsers: {
                        $sum: { $cond: [{ $ne: ['$deletedAt', null] }, 1, 0] }
                    },
                    allUsers: { $sum: 1 },
                    adminUsers: {
                        $sum: { $cond: [{ $and: [{ $eq: ['$role', 'admin'] }, { $eq: ['$deletedAt', null] }] }, 1, 0] }
                    },
                    verifiedUsers: {
                        $sum: { $cond: [{ $and: [{ $eq: ['$emailVerified', true] }, { $eq: ['$deletedAt', null] }] }, 1, 0] }
                    }
                }
            }
        ]);

        const recentUsers = await User.find({ deletedAt: { $eq: null } })
            .select('firstName lastName email createdAt')
            .sort({ createdAt: -1 })
            .limit(5);

        const recentlyDeleted = await User.findWithDeleted()
            .select('firstName lastName email deletedAt')
            .populate('deletedBy', 'firstName lastName')
            .sort({ deletedAt: -1 })
            .limit(5);

        res.json({
            success: true,
            data: {
                overview: stats[0] || {
                    totalUsers: 0,
                    deletedUsers: 0,
                    allUsers: 0,
                    activeUsers: 0,
                    adminUsers: 0,
                    verifiedUsers: 0
                },
                recentUsers,
                recentlyDeleted
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching user statistics',
            error: error.message
        });
    }
};

// GET /api/users/deleted - Get all soft deleted users (Admin only)
const getDeletedUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            sortBy = 'deletedAt',
            sortOrder = 'desc'
        } = req.query;

        // Build query for deleted users
        const query = { deletedAt: { $ne: null } };

        // Search across name and email
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (page - 1) * limit;
        const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        // Execute query with pagination
        const users = await User.findWithDeleted()
            .find(query)
            .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate('deletedBy', 'firstName lastName email');

        // Get total count for pagination info
        const total = await User.findWithDeleted().countDocuments(query);
        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            data: users,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems: total,
                itemsPerPage: parseInt(limit),
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching deleted users',
            error: error.message
        });
    }
};

// POST /api/users/:id/restore - Restore a soft deleted user (Admin only)
const restoreUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the user including deleted ones
        const user = await User.findWithDeleted().findOne({ _id: id });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.deletedAt === null) {
            return res.status(400).json({
                success: false,
                message: 'User is not deleted'
            });
        }

        // Restore the user using the model method
        await user.restore();

        res.json({
            success: true,
            message: 'User restored successfully',
            data: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
            }
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error restoring user',
            error: error.message
        });
    }
};

module.exports = {
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
};
