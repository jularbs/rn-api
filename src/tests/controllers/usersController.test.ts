import { describe, it, afterEach, beforeEach, vi, expect } from "vitest";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { createUser, deleteUser, restoreUser, updateUser } from "@/controllers/usersController";
import { UserModel } from "@/models/User";
describe("Users Controller", () => {
  // Tests will be added here in the future
  let req: Partial<Request>;
  let res: Partial<Response>;

  let statusMock: ReturnType<typeof vi.fn>;
  let jsonMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    statusMock = vi.fn().mockReturnThis();
    jsonMock = vi.fn().mockReturnThis();

    req = {
      params: {},
      query: {},
      body: {},
    };

    res = {
      status: statusMock,
      json: jsonMock,
    };

    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        const collection = collections[key];
        collection.deleteMany({});
      }
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Success Cases", () => {
    it("should create a new user successfully", async () => {
      const validUserData = {
        fullName: "Test User",
        email: "testuser@example.com",
        password: "password123",
      };
      req.body = validUserData;
      // Call createUser controller function here
      await createUser(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "User created successfully",
          data: expect.objectContaining({
            fullName: validUserData.fullName,
            email: validUserData.email,
          }),
        })
      );

      expect(jsonMock).not.toHaveProperty("password");
      expect(jsonMock).not.toHaveProperty("emailVerificationToken");
      expect(jsonMock).not.toHaveProperty("passwordResetToken");

      //verify user is in DB
      const createdUserInDb = await UserModel.findOne({ email: validUserData.email });
      expect(createdUserInDb).not.toBeNull();
      expect(createdUserInDb?.fullName).toBe(validUserData.fullName);
      expect(createdUserInDb?.email).toBe(validUserData.email);
    });

    it("should update an existing user successfully", async () => {
      // Future implementation for update user test
      const userData = {
        fullName: "Created User",
        email: "createduser@example.com",
        password: "password123",
      };

      const createdUserData = await UserModel.create(userData);
      req.params = { id: createdUserData._id.toString() };

      req.body = {
        fullName: "Updated User",
        email: "updateduser@example.com",
      };

      // Call updateUser controller function here
      await updateUser(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "User updated successfully",
          data: expect.objectContaining({
            fullName: "Updated User",
            email: "updateduser@example.com",
          }),
        })
      );

      // confirm update in DB
      const updatedUserInDb = await UserModel.findById(createdUserData._id);
      expect(updatedUserInDb).not.toBeNull();
      expect(updatedUserInDb?.fullName).toBe("Updated User");
      expect(updatedUserInDb?.email).toBe("updateduser@example.com");
    });

    it("should soft delete an existing user successfully", async () => {
      // Future implementation for soft delete user test
      const userData = {
        fullName: "Delete User",
        email: "deleteuser@example.com",
        password: "password123",
      };

      const createdUserData = await UserModel.create(userData);

      //verify that created user in db
      const createdUser = await UserModel.findById(createdUserData._id);
      expect(createdUser).not.toBeNull();

      req.params = { id: createdUserData._id.toString() };

      await deleteUser(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "User deleted successfully",
        })
      );
      // confirm soft delete in DB
      const deletedUserInDb = await UserModel.findById(createdUserData._id);
      expect(deletedUserInDb).toBeNull();

      //   const deletedUserWithDeleted = await UserModel.findById(createdUserData._id).setOptions({ includeDeleted: true });
      const deletedUserWithDeleted = await UserModel.findWithDeleted().findById(createdUserData._id);
      expect(deletedUserWithDeleted).not.toBeNull();
    });

    it("should restore a soft deleted user successfully", async () => {
      // Future implementation for restore user test
      const userData = {
        fullName: "Restore User",
        email: "restoreuser@example.com",
        password: "password123",
      };

      const createdUserData = await UserModel.create(userData);

      await createdUserData.softDelete();

      //confirm user is deleted
      const deletedUserInDb = await UserModel.findById(createdUserData._id);
      expect(deletedUserInDb).toBeNull();

      req.params = { id: createdUserData._id.toString() };

      await restoreUser(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "User restored successfully",
        })
      );

      // confirm restore in DB
      const restoredUserInDb = await UserModel.findById(createdUserData._id);
      expect(restoredUserInDb).not.toBeNull();
    });

    //TODOS: Create test for reading user with getUserById

    //TODOS: Create test for fetching all users with getAllUsers
  });
});
