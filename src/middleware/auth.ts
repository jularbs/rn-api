import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { UserModel } from "../models/User";
import { UserRole } from "../types";

// Generate JWT token
export const generateToken = (userId: Types.ObjectId): string => {
  const payload = { userId: userId.toString() };
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

// Verify JWT token
export const verifyToken = (token: string): { userId: string } => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return jwt.verify(token, secret) as { userId: string };
};

// Authentication middleware
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    // Check for token in cookies (if you're using cookie-based auth)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
      return;
    }

    // Verify token
    const decoded = verifyToken(token);

    // Check if user still exists and is active
    const user = await UserModel.findById(decoded.userId).select("-password");

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Token is no longer valid. User not found.",
      });
      return;
    }

    // Update last login time
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Add user to request object
    req.user = user;
    next();
  } catch (error: unknown) {
    const err = error as Error & { name?: string };
    
    if (err.name === "JsonWebTokenError") {
      res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
      return;
    }

    if (err.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        message: "Token has expired.",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Authentication error.",
      error: err.message,
    });
  }
};

// Authorization middleware - check user roles
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
      return;
    }

    next();
  };
};

// Optional authentication - authenticate if token is provided, but don't require it
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = verifyToken(token);
        const user = await UserModel.findById(decoded.userId).select(
          "-password"
        );

        if (user) {
          req.user = user;
          user.lastLogin = new Date();
          await user.save({ validateBeforeSave: false });
        }
      } catch (error) {
        // Token is invalid but we don't return error for optional auth
        req.user = undefined;
      }
    }

    next();
  } catch (error) {
    // For optional auth, we continue even if there's an error
    req.user = undefined;
    next();
  }
};

// Check if user owns the resource or is admin
export const ownerOrAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  const resourceUserId = req.params.id || req.params.userId;

  if (req.user.role === "admin" || req.user._id.toString() === resourceUserId) {
    return next();
  }

  res.status(403).json({
    success: false,
    message: "Access denied. You can only access your own resources.",
  });
};
