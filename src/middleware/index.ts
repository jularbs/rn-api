import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { CorsOptions } from 'cors';

// CORS configuration based on environment variables
export const corsConfig = (): CorsOptions => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [];

  // In development, allow all origins if no specific origins are set
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // In development with no specific origins set, allow all
      if (isDevelopment && allowedOrigins.length === 0) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Reject origin
      const message = `CORS policy: Origin ${origin} is not allowed. Allowed origins: ${allowedOrigins.join(', ')}`;
      return callback(new Error(message), false);
    },
    credentials: true, // Allow cookies and authorization headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key'
    ],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    optionsSuccessStatus: 200 // For legacy browser support
  };
};

// Rate limiting middleware
export const createRateLimiter = (
  windowMs: number = 1 * 60 * 1000,
  maxRequests: number = 50,
  message: string = "Too many requests. Please try again later."
) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      success: false,
      message: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// API key authentication middleware (optional)
export const authenticateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.header('X-API-Key') || (req.query.apikey as string);

  // Skip authentication in development
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  if (!apiKey) {
    res.status(401).json({
      success: false,
      message: 'API key is required'
    });
    return;
  }

  // Validate API key (replace with your actual validation logic)
  const validApiKey = process.env.API_KEY;
  if (apiKey !== validApiKey) {
    res.status(401).json({
      success: false,
      message: 'Invalid API key'
    });
    return;
  }

  next();
};

// Export all auth middleware
export * from './auth';
