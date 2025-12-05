import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { register } from "@/controllers/authController";
import { UserModel } from "@/models/User";
import { RegisterRequest } from "@/types/authTypes";

describe("Auth Controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: ReturnType<typeof vi.fn>;
  let jsonMock: ReturnType<typeof vi.fn>;
  process.env.JWT_SECRET = "test_jwt_secret";

  beforeEach(async () => {
    // Setup Express mocks
    statusMock = vi.fn().mockReturnThis();
    jsonMock = vi.fn().mockReturnThis();

    req = {
      body: {},
    };

    res = {
      status: statusMock,
      json: jsonMock,
    };

    // Clear all collections before each test
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
      }
    }
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  describe("Registration Tests", () => {
    it("should return 400 if required fields are missing", async () => {
      req.body = {
        fullName: "",
        email: "invalid-email",
        password: "123",
      };

      await register(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Validation failed",
        errors: [
          "Full name is required",
          "Please provide a valid email address",
          "Password must be at least 6 characters long",
        ],
      });
    });

    it("should register a new user with valid data", async () => {
      const validUserData: RegisterRequest = {
        fullName: "John Doe",
        email: "john.doe@example.com",
        password: "password123",
      };

      req.body = validUserData;

      await register(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: "User registered successfully. Please wait for account activation.",
      });

      // Verify user was created in database
      const user = await UserModel.findOne({ email: validUserData.email });
      expect(user).toBeTruthy();
      expect(user?.fullName).toBe(validUserData.fullName);
      expect(user?.email).toBe(validUserData.email);
      expect(user?.accountVerified).toBe(false);
    });

    it("should not allow registration with an existing email", async () => {
      const existingUserData: RegisterRequest = {
        fullName: "Jane Smith",
        email: "jane.smith@example.com",
        password: "securePass1",
      };

      // Create existing user
      const existingUser = new UserModel(existingUserData);
      await existingUser.save();

      req.body = existingUserData;

      await register(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "User with this email already exists",
      });
    });
  });

  describe("Login Tests", () => {
    it("should login successfully after registration", async () => {
      const newUserData: RegisterRequest = {
        fullName: "Alice Johnson",
        email: "alice.johnson@example.com",
        password: "myStrongPassword",
      };
      req.body = newUserData;
      await register(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: "User registered successfully. Please wait for account activation.",
      });

      //set user as verified for login test
      const user = await UserModel.findOne({ email: newUserData.email });
      if (user) {
        user.accountVerified = true;
        await user.save();
      }

      // Mock login request
      req.body = {
        email: newUserData.email,
        password: newUserData.password,
      };
      
      const { login } = await import("@/controllers/authController");
      await login(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Login successful",
          data: expect.objectContaining({
            token: expect.any(String),
            user: expect.objectContaining({
              email: newUserData.email,
              fullName: newUserData.fullName,
            }),
          }),
        })
      );
    });

    it("should not login unverified user", async () => {
      const unverifiedUserData: RegisterRequest = {
        fullName: "Bob Brown",
        email: "bob.brown@example.com",
        password: "anotherStrongPass",
      };
      req.body = unverifiedUserData;
      await register(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: "User registered successfully. Please wait for account activation.",
      });
      // Attempt login without verifying account
      req.body = {
        email: unverifiedUserData.email,
        password: unverifiedUserData.password,
      };
      
      const { login } = await import("@/controllers/authController");
      await login(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Account is not yet activated. Please wait for admin approval.",
      });
    });

    it("should not login with incorrect password", async () => {
      const userData: RegisterRequest = {
        fullName: "Charlie Green",
        email: "charlie.green@example.com",
        password: "correctPassword",
      };
      req.body = userData;
      await register(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: "User registered successfully. Please wait for account activation.",
      });

      //set user as verified for login test
      const user = await UserModel.findOne({ email: userData.email });
      if (user) {
        user.accountVerified = true;
        await user.save();
      }

      // Attempt login with incorrect password
      req.body = {
        email: userData.email,
        password: "wrongPassword",
      };
      
      const { login } = await import("@/controllers/authController");
      await login(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
    });
  });
});
