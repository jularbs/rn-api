import { Request, Response } from 'express';
import { UserModel } from '@/models/User';

// POST /api/users - Create new user
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userData = req.body;

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email: userData.email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
      return;
    }

    // Create new user
    const user = new UserModel(userData);
    await user.save();

    // Return user without sensitive information
    const userResponse = await UserModel.findById(user._id)
      .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires');

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error: unknown) {
    const err = error as Error & { name?: string; code?: number; errors?: Record<string, { message: string }> };
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors || {}).map((validationErr) => validationErr.message);
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
      return;
    }

    if (err.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: err.message
    });
  }
};

// GET /api/users/:id - Get user by ID (Owner or Admin)
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await UserModel.findById(id)
      .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error: unknown) {
    const err = error as Error & { name?: string };
    
    if (err.name === 'CastError') {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: err.message
    });
  }
};

// GET /api/users - Get all users with pagination and filtering (Admin only)
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      search,
      accountVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    // Build query
    const query: Record<string, unknown> = {};

    if (role) {
      query.role = role;
    }

    if(accountVerified !== undefined) {
      query.accountVerified = accountVerified === 'true';
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort configuration
    const sortConfig: Record<string, 1 | -1> = {};
    sortConfig[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const [users, total] = await Promise.all([
      UserModel.find()
        .where(query)
        .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires')
        .sort(sortConfig)
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber),
      UserModel.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limitNumber);

    res.json({
        success: true,
        data: users,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages
        }
      });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: err.message
    });
  }
};

// PUT /api/users/:id - Update user by ID (Owner or Admin)
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Get the current user to check if accountVerified is being changed
    const currentUser = await UserModel.findById(id).select('accountVerified email fullName');
    
    if (!currentUser) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Check if accountVerified is being updated from false to true
    const shouldSendWelcomeEmail = 
      currentUser.accountVerified === false && 
      updates.accountVerified === true;

    // Prevent password updates through this endpoint
    delete updates.password;
    delete updates.emailVerificationToken;
    delete updates.passwordResetToken;
    delete updates.passwordResetExpires;

    const user = await UserModel.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires')
    .where({ deletedAt: null });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Send welcome email if account was just verified
    if (shouldSendWelcomeEmail) {
      try {
        const { sendWelcomeEmail } = await import('@/utils/nodemailer');
        await sendWelcomeEmail(user.email, user.fullName);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the update if email sending fails
      }
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error: unknown) {
    const err = error as Error & { name?: string; errors?: Record<string, { message: string }> };
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors || {}).map((validationErr) => validationErr.message);
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
      return;
    }

    if (err.name === 'CastError') {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: err.message
    });
  }
};

// DELETE /api/users/:id - Soft delete user by ID (Admin only)
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    const user = await UserModel.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Soft delete the user
    await user.softDelete(currentUser?._id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error: unknown) {
    const err = error as Error & { name?: string };
    
    if (err.name === 'CastError') {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: err.message
    });
  }
};

// POST /api/users/:id/restore - Restore soft deleted user (Admin only)
export const restoreUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await UserModel.findWithDeleted().findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    if (!user.isDeletedUser()) {
      res.status(400).json({
        success: false,
        message: 'User is not deleted'
      });
      return;
    }

    await user.restore();

    res.json({
      success: true,
      message: 'User restored successfully'
    });
  } catch (error: unknown) {
    const err = error as Error & { name?: string };
    
    if (err.name === 'CastError') {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error restoring user',
      error: err.message
    });
  }
};
