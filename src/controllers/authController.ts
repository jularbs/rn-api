import { Request, Response } from "express";
import { createHash } from "crypto";
import { UserModel } from "@/models/User";
import { generateToken } from "@/middleware/auth";
import {
  RegisterRequest,
  LoginRequest,
  RequestPasswordResetRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
} from "@/types/authTypes";

// POST /api/auth/register - Register new user
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, password, phone, role }: RegisterRequest = req.body;

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
      fullName,
      email,
      password,
      phone,
      role: role || "digital-content-producer", // Default to digital-content-producer role
    };

    const user = new UserModel(userData);
    await user.save();

    res.status(200).json({
      success: true,
      message: "User registered successfully. Please wait for account activation.",
    });
  } catch (error: unknown) {
    const err = error as Error & {
      name?: string;
      code?: number;
      errors?: Record<string, { message: string }>;
    };

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors || {}).map((validationErr) => validationErr.message);
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
        message: "Account is not yet activated. Please wait for admin approval.",
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
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
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

// POST /api/auth/request-password-reset - Request password reset
export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email }: RequestPasswordResetRequest = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required",
      });
      return;
    }

    // Find user by email
    const user = await UserModel.findOne({ email: email.toLowerCase() });

    if (!user) {
      // For security reasons, always return success even if user doesn't exist
      res.json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      });
      return;
    }

    // Check if user is soft deleted
    if (user.deletedAt) {
      res.json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      });
      return;
    }

    // Check if user account is verified
    if (!user.accountVerified) {
      res.json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      });
      return;
    }

    // Generate password reset token (expires in 2 hours)
    const resetToken = user.createPasswordResetToken();

    // Save user with reset token
    await user.save({ validateBeforeSave: false });

    const sendPasswordResetEmail = require("@/utils/nodemailer").sendPasswordResetEmail;
    await sendPasswordResetEmail(user.email, user.fullName, resetToken);

    res.json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
      // Remove this in production - only for development/testing
      resetToken: process.env.NODE_ENV === "development" ? resetToken : undefined,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error in password reset request:", err);

    res.status(500).json({
      success: false,
      message: "An error occurred while processing your request. Please try again later.",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// POST /api/auth/reset-password - Reset password using token
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("Reset Password Request Body:", req.body);
    const { token, password, confirm }: ResetPasswordRequest = req.body;

    // Validation
    if (!token) {
      res.status(400).json({
        success: false,
        message: "Reset token is required",
      });
      return;
    }

    if (!password) {
      res.status(400).json({
        success: false,
        message: "New password is required",
      });
      return;
    }

    if (!confirm) {
      res.status(400).json({
        success: false,
        message: "Password confirmation is required",
      });
      return;
    }

    if (password !== confirm) {
      res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
      return;
    }

    // Hash the received token to compare with stored token
    const hashedToken = createHash("sha256").update(token).digest("hex");

    // Find user with matching reset token and check if token hasn't expired
    const user = await UserModel.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }, // Token must not be expired
    }).select("+passwordResetToken +passwordResetExpires");

    if (!user) {
      res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
      return;
    }

    // Check if user is soft deleted
    if (user.deletedAt) {
      res.status(400).json({
        success: false,
        message: "Account has been deleted. Please contact support.",
      });
      return;
    }

    // Check if user account is verified
    if (!user.accountVerified) {
      res.status(400).json({
        success: false,
        message: "Account is not yet activated. Please wait for admin approval.",
      });
      return;
    }

    // Set new password and clear reset token fields
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    // Save user with new password (password will be hashed by pre-save middleware)
    await user.save();

    // Send Change password notification email
    const sendPasswordChangeNotificationEmail = require("@/utils/nodemailer").sendPasswordChangeNotificationEmail;
    await sendPasswordChangeNotificationEmail(user.email, user.fullName);

    res.json({
      success: true,
      message: "Password has been reset successfully. You can now login with your new password.",
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error in password reset:", err);

    res.status(500).json({
      success: false,
      message: "An error occurred while resetting your password. Please try again later.",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// PUT /api/auth/change-password - Change password for logged-in users
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword, confirmPassword }: ChangePasswordRequest = req.body;

    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
      return;
    }

    // Validation
    if (!currentPassword) {
      res.status(400).json({
        success: false,
        message: "Current password is required",
      });
      return;
    }

    if (!newPassword) {
      res.status(400).json({
        success: false,
        message: "New password is required",
      });
      return;
    }

    if (!confirmPassword) {
      res.status(400).json({
        success: false,
        message: "Password confirmation is required",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({
        success: false,
        message: "New password and confirmation do not match",
      });
      return;
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
      return;
    }

    // Check if new password is different from current password
    if (currentPassword === newPassword) {
      res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
      return;
    }

    // Get user with password field included
    const user = await UserModel.findById(req.user._id).select("+password");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Check if user is soft deleted
    if (user.deletedAt) {
      res.status(403).json({
        success: false,
        message: "Account has been deleted. Please contact support.",
      });
      return;
    }

    // Check if user account is verified
    if (!user.accountVerified) {
      res.status(403).json({
        success: false,
        message: "Account is not yet activated. Please wait for admin approval.",
      });
      return;
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
      return;
    }

    // Update password
    user.password = newPassword;
    await user.save();

    const sendPasswordChangeNotificationEmail = require("@/utils/nodemailer").sendPasswordChangeNotificationEmail;
    await sendPasswordChangeNotificationEmail(user.email, user.fullName);
    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error in change password:", err);

    res.status(500).json({
      success: false,
      message: "An error occurred while changing your password. Please try again later.",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};
