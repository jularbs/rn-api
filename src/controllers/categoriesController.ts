import { Request, Response } from "express";
import { CategoryModel } from "../models/Category";
import { Types } from "mongoose";
import slugify from "slugify";

// GET /api/categories - Get all categories with filtering and pagination
export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { isActive, page = "1", limit = "10", search, sortBy = "sortOrder", sortOrder = "asc", includeInactive = "false" } = req.query;

    // Build filter object
    const filter: Record<string, unknown> = {};

    // Filter by active status - authenticated users can see all by default
    const isAuthenticated = !!req.user;

    if (includeInactive !== "true") {
      if (isAuthenticated) {
        // Authenticated users: respect isActive parameter, show all if not specified
        if (isActive !== undefined) {
          filter.isActive = isActive === "false" ? false : true;
        }
        // If isActive is not specified, show all categories (active and inactive)
      } else {
        // Unauthenticated users: only show active categories
        filter.isActive = true;
      }
    }

    // Search functionality
    if (search && typeof search === "string") {
      filter.$or = [{ name: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }, { slug: { $regex: search, $options: "i" } }];
    }

    // Pagination
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sortField = typeof sortBy === "string" ? sortBy : "sortOrder";
    const sortDirection = sortOrder === "desc" ? -1 : 1;
    const sortObj: Record<string, 1 | -1> = {};
    sortObj[sortField] = sortDirection;

    // Get categories with pagination
    const categories = await CategoryModel.find(filter).sort(sortObj).skip(skip).limit(limitNum);

    // Get total count for pagination
    const total = await CategoryModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      message: "Categories retrieved successfully",
      data: {
        categories,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get categories error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving categories",
      error: err.message,
    });
  }
};

// GET /api/categories/:id - Get single category by ID
export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid category ID format",
      });
      return;
    }

    const category = await CategoryModel.findById(id);

    if (!category) {
      res.status(404).json({
        success: false,
        message: "Category not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Category retrieved successfully",
      data: { category },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get category by ID error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving category",
      error: err.message,
    });
  }
};

// GET /api/categories/slug/:slug - Get single category by slug
export const getCategoryBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const category = await CategoryModel.findOne({
      slug: slug.toLowerCase(),
      isActive: true,
    });

    if (!category) {
      res.status(404).json({
        success: false,
        message: "Category not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Category retrieved successfully",
      data: { category },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get category by slug error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving category",
      error: err.message,
    });
  }
};

// POST /api/categories - Create new category
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, slug, description, isActive = true, sortOrder, metaTitle, metaDescription } = req.body;

    // Validate required fields
    if (!name) {
      res.status(400).json({
        success: false,
        message: "Category name is required",
      });
      return;
    }

    // Generate slug if not provided
    let finalSlug = slug;
    if (!finalSlug) {
      finalSlug = slugify(name, {
        lower: true,
        strict: true,
        remove: /[*+~.()'"!:@]/g,
      });
    }

    // Check if slug already exists
    const existingCategory = await CategoryModel.findOne({
      slug: finalSlug.toLowerCase(),
    });
    if (existingCategory) {
      res.status(409).json({
        success: false,
        message: "Category with this slug already exists",
      });
      return;
    }

    // Get next sort order if not provided
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined) {
      finalSortOrder = await CategoryModel.getNextSortOrder();
    }

    // Create new category
    const categoryData = {
      name: name.trim(),
      slug: finalSlug.toLowerCase().trim(),
      description: description?.trim(),
      isActive,
      sortOrder: finalSortOrder,
      metaTitle: metaTitle?.trim(),
      metaDescription: metaDescription?.trim(),
    };

    const category = new CategoryModel(categoryData);
    await category.save();

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: { category },
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
      res.status(409).json({
        success: false,
        message: "Category with this slug already exists",
      });
      return;
    }

    console.error("Create category error:", err);
    res.status(500).json({
      success: false,
      message: "Error creating category",
      error: err.message,
    });
  }
};

// PUT /api/categories/:id - Update category by ID
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid category ID format",
      });
      return;
    }

    // Check if category exists
    const existingCategory = await CategoryModel.findById(id);
    if (!existingCategory) {
      res.status(404).json({
        success: false,
        message: "Category not found",
      });
      return;
    }

    // Check slug uniqueness if being updated
    if (updateData.slug && updateData.slug !== existingCategory.slug) {
      const slugExists = await CategoryModel.findOne({
        slug: updateData.slug.toLowerCase(),
        _id: { $ne: id },
      });

      if (slugExists) {
        res.status(409).json({
          success: false,
          message: "Category with this slug already exists",
        });
        return;
      }
    }

    // Prepare update data
    const sanitizedUpdateData: Record<string, unknown> = {};

    if (updateData.name !== undefined) sanitizedUpdateData.name = updateData.name?.trim();
    if (updateData.slug !== undefined) sanitizedUpdateData.slug = updateData.slug?.toLowerCase().trim();
    if (updateData.description !== undefined) sanitizedUpdateData.description = updateData.description?.trim();
    if (updateData.isActive !== undefined) sanitizedUpdateData.isActive = updateData.isActive;
    if (updateData.sortOrder !== undefined) sanitizedUpdateData.sortOrder = updateData.sortOrder;
    if (updateData.metaTitle !== undefined) sanitizedUpdateData.metaTitle = updateData.metaTitle?.trim();
    if (updateData.metaDescription !== undefined) sanitizedUpdateData.metaDescription = updateData.metaDescription?.trim();

    // Update category
    const updatedCategory = await CategoryModel.findByIdAndUpdate(id, sanitizedUpdateData, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: "Category updated successfully",
      data: { category: updatedCategory },
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
      res.status(409).json({
        success: false,
        message: "Category with this slug already exists",
      });
      return;
    }

    console.error("Update category error:", err);
    res.status(500).json({
      success: false,
      message: "Error updating category",
      error: err.message,
    });
  }
};

// DELETE /api/categories/:id - Delete category by ID
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid category ID format",
      });
      return;
    }

    // Check if category exists
    const category = await CategoryModel.findById(id);
    if (!category) {
      res.status(404).json({
        success: false,
        message: "Category not found",
      });
      return;
    }

    // Delete the category
    const deletedCategory = await CategoryModel.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Category deleted successfully",
      data: { category: deletedCategory },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Delete category error:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting category",
      error: err.message,
    });
  }
};
// PATCH /api/categories/:id/toggle-status - Toggle category active status
export const toggleCategoryStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid category ID format",
      });
      return;
    }

    const category = await CategoryModel.findById(id);

    if (!category) {
      res.status(404).json({
        success: false,
        message: "Category not found",
      });
      return;
    }

    // Toggle status
    const newStatus = !category.isActive;

    const updatedCategory = await CategoryModel.findByIdAndUpdate(id, { isActive: newStatus }, { new: true });

    res.json({
      success: true,
      message: `Category ${newStatus ? "activated" : "deactivated"} successfully`,
      data: { category: updatedCategory },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Toggle category status error:", err);
    res.status(500).json({
      success: false,
      message: "Error updating category status",
      error: err.message,
    });
  }
};

// POST /api/categories/reorder - Reorder categories
export const reorderCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categories } = req.body;

    if (!Array.isArray(categories)) {
      res.status(400).json({
        success: false,
        message: "Categories array is required",
      });
      return;
    }

    // Update sort order for each category
    const updatePromises = categories.map((cat: { id: string; sortOrder: number }) => {
      if (!Types.ObjectId.isValid(cat.id)) {
        throw new Error(`Invalid category ID: ${cat.id}`);
      }
      return CategoryModel.findByIdAndUpdate(cat.id, { sortOrder: cat.sortOrder });
    });

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: "Categories reordered successfully",
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Reorder categories error:", err);
    res.status(500).json({
      success: false,
      message: "Error reordering categories",
      error: err.message,
    });
  }
};
