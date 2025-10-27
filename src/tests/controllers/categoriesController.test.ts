import { vi, it, describe, expect, beforeEach, afterEach } from "vitest";
import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  getCategoryBySlug,
  toggleCategoryStatus,
  updateCategory,
} from "@/controllers/categoriesController";
import { CategoryModel } from "@/models/Category";

describe("Categories Controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  let statusMock: ReturnType<typeof vi.fn>;
  let jsonMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    statusMock = vi.fn().mockReturnThis();
    jsonMock = vi.fn().mockReturnThis();

    req = { body: {}, params: {} };
    res = {
      status: statusMock,
      json: jsonMock,
    };

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

  it("should create category successfully", async () => {
    const categoryData = {
      name: "Category one",
      description: "Description for category one",
      isActive: true,
    };

    req.body = categoryData;

    await createCategory(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Category created successfully",
        data: expect.objectContaining({
          name: categoryData.name,
          description: categoryData.description,
          isActive: categoryData.isActive,
        }),
      })
    );
  });

  it("should return 400 if name is missing", async () => {
    req.body = {
      description: "Description without a name",
    };

    await createCategory(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Category name is required",
    });
  });

  it("should return 400 if name exceeds max length", async () => {
    req.body = {
      name: "A".repeat(101),
      description: "Description with a very long name",
    };

    await createCategory(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Validation failed",
      errors: ["Category name cannot exceed 100 characters"],
    });
  });

  it("should toggle category successfully", async () => {
    //create a new category
    const categoryData = {
      name: "Category one",
      description: "Description for category one",
    };

    req.body = categoryData;

    await createCategory(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Category created successfully",
        data: expect.objectContaining({
          name: categoryData.name,
          description: categoryData.description,
        }),
      })
    );

    //get created category
    const category = await CategoryModel.findOne({ name: categoryData.name });

    //test toggle category
    if (!category) throw new Error("Category not found");
    req.params = { id: category._id.toString() };
    await toggleCategoryStatus(req as Request, res as Response);

    //check if created category isActive has been toggled
    const toggledCategory = await CategoryModel.findOne({ name: categoryData.name });
    if (!toggledCategory) throw new Error("Toggled category not found");

    expect(category.isActive === toggledCategory?.isActive).toBe(false);
  });

  it("should update category successfully", async () => {
    //create a new category
    const categoryData = {
      name: "Category one",
      description: "Description for category one",
    };

    req.body = categoryData;

    await createCategory(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Category created successfully",
        data: expect.objectContaining({
          name: categoryData.name,
          description: categoryData.description,
        }),
      })
    );

    //get created category
    const category = await CategoryModel.findOne({ name: categoryData.name });

    //test update category
    if (!category) throw new Error("Category not found");
    req.params = { id: category._id.toString() };
    req.body = {
      name: "Updated Category",
      description: "Updated Description",
    };
    await updateCategory(req as Request, res as Response);

    //check if category has been updated
    const updatedCategory = await CategoryModel.findOne({ _id: category._id });
    if (!updatedCategory) throw new Error("Updated category not found");

    expect(updatedCategory.name).toBe(req.body.name);
    expect(updatedCategory.description).toBe(req.body.description);
  });

  it("should delete category successfully", async () => {
    //create category
    const existingCategoryData = {
      name: "Category One",
      description: "Description for category one",
    };

    const category = new CategoryModel(existingCategoryData);
    await category.save();

    req.params = { id: category._id.toString() };

    await deleteCategory(req as Request, res as Response);

    // Check that the response was successful
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: expect.stringContaining("deleted successfully"),
      })
    );

    // Check that the category no longer exists in the database
    const deletedCategory = await CategoryModel.findOne({ name: existingCategoryData.name });
    expect(deletedCategory).toBeNull();

    // Also check by ID to be thorough
    const deletedCategoryById = await CategoryModel.findById(category._id);
    expect(deletedCategoryById).toBeNull();
  });

  it("should return 404 when trying to delete non-existent category", async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    req.params = { id: nonExistentId.toString() };

    await deleteCategory(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Category not found",
    });
  });

  it("should return 400 for invalid category ID format", async () => {
    req.params = { id: "invalid-id-format" };

    await deleteCategory(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Invalid category ID format",
    });
  });

  it("should return 404 when trying to access non existent category by id", async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    req.params = { id: nonExistentId.toString() };

    await getCategoryById(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Category not found",
    });
  });

  it("should return 404 when trying to access non existent category by slug", async () => {
    req.params = { slug: "non-existent-slug" };

    await getCategoryBySlug(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Category not found",
    });
  });
});
