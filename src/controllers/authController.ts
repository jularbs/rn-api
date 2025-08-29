import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { generateToken } from '../middleware/auth';
import { RegisterRequest, LoginRequest } from '../types';

// POST /api/auth/register - Register new user
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, password, phone, role }: RegisterRequest = req.body;

    // Check if user already exists
    const existingUser = await UserModel.findOneActive({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
      return;
    }

    // Create new user
    const userData = {
      firstName,
      lastName,
      email,
      password,
      phone,
      role: role || 'user' // Default to user role
    };

    const user = new UserModel(userData);
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Return user data without sensitive information
    const userResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      email: user.email,
      phone: phone,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
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
      message: 'Error registering user',
      error: err.message
    });
  }
};

// POST /api/auth/login - Login user
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
      return;
    }

    // Find user and include password for comparison
    const user = await UserModel.findOneActive({ email }).select('+password');

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
      return;
    }

    // Check if user is soft deleted
    if (user.deletedAt) {
      res.status(401).json({
        success: false,
        message: 'Account has been deleted. Please contact support.'
      });
      return;
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
      return;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate token
    const token = generateToken(user._id);

    // Return user data without sensitive information
    const userResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: err.message
    });
  }
};

// GET /api/auth/me - Get current user profile
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const userResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({
      success: true,
      data: userResponse
    });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: err.message
    });
  }
};

// PUT /api/auth/me - Update current user profile
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const allowedUpdates = ['firstName', 'lastName', 'phone'];
    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj: Record<string, unknown>, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        message: 'No valid updates provided'
      });
      return;
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      user!._id,
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const userResponse = {
      id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      role: updatedUser.role,
      emailVerified: updatedUser.emailVerified,
      lastLogin: updatedUser.lastLogin,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    };

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: userResponse
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

    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: err.message
    });
  }
};

// POST /api/auth/logout - Logout user (if using token blacklist)
export const logout = async (req: Request, res: Response): Promise<void> => {
  // For stateless JWT, logout is handled client-side by removing the token
  // If you implement token blacklisting, you would add the token to a blacklist here
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};
