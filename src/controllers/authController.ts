import { Request, Response } from "express";
import { UserModel } from "../models/User";
import { generateToken } from "../middleware/auth";
import { RegisterRequest, LoginRequest } from "../types/authTypes";

// POST /api/auth/register - Register new user
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      role,
    }: RegisterRequest = req.body;

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "User with this email already exists",
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
      role: role || "user", // Default to user role
    };

    const user = new UserModel(userData);
    await user.save();

    res.status(200).json({
      success: true,
      message:
        "User registered successfully. Please wait for account activation.",
    });
  } catch (error: unknown) {
    const err = error as Error & {
      name?: string;
      code?: number;
      errors?: Record<string, { message: string }>;
    };

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors || {}).map(
        (validationErr) => validationErr.message
      );
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
      return;
    }

    if (err.code === 11000) {
      res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Error registering user",
      error: err.message,
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
        message: "Email and password are required",
      });
      return;
    }

    // Find user and include password for comparison
    const user = await UserModel.findOne({ email }).select("+password");

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    // Check if user is soft deleted
    if (user.deletedAt) {
      res.status(401).json({
        success: false,
        message: "Account has been deleted. Please contact support.",
      });
      return;
    }

    //Check if user is verified
    if (!user.accountVerified) {
      res.status(401).json({
        success: false,
        message:
          "Account is not yet activated. Please wait for admin approval.",
      });
      return;
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
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
      createdAt: user.createdAt,
    };

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: userResponse,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      message: "Error during login",
      error: err.message,
    });
  }
};

// POST /api/auth/logout - Logout user (if using token blacklist)
export const logout = async (req: Request, res: Response): Promise<void> => {
  // For stateless JWT, logout is handled client-side by removing the token
  // If you implement token blacklisting, you would add the token to a blacklist here

  res.json({
    success: true,
    message: "Logged out successfully",
  });
};
