import { Request, Response } from "express";
import { CategoryModel } from "../models/Category";
import { Types } from "mongoose";

// GET /api/categories - Get all categories with filtering and pagination
export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      isActive, 
      parent, 
      page = "1", 
      limit = "10", 
      search,
      sortBy = "sortOrder",
      sortOrder = "asc",
      includeInactive = "false"
    } = req.query;

    // Build filter object
    const filter: Record<string, unknown> = {};

    // Filter by active status
    if (includeInactive !== "true") {
      filter.isActive = isActive === "false" ? false : true;
    }

    // Filter by parent category
    if (parent === "null" || parent === "") {
      filter.parent = null;
    } else if (parent && typeof parent === "string" && Types.ObjectId.isValid(parent)) {
      filter.parent = parent;
    }

    // Search functionality
    if (search && typeof search === "string") {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } }
      ];
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

    // Get categories with pagination and population
    const categories = await CategoryModel.find(filter)
      .populate("parent", "name slug")
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

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

// GET /api/categories/tree - Get category tree structure
export const getCategoryTree = async (req: Request, res: Response): Promise<void> => {
  try {
    const { includeInactive = "false" } = req.query;

    const filter: Record<string, unknown> = {};
    if (includeInactive !== "true") {
      filter.isActive = true;
    }

    // Get all categories
    const allCategories = await CategoryModel.find(filter)
      .populate("parent", "name slug")
      .sort({ sortOrder: 1, name: 1 });

    // Build tree structure
    const categoryMap = new Map();
    const rootCategories: Array<Record<string, unknown>> = [];

    // First pass: create map of all categories
    allCategories.forEach(category => {
      categoryMap.set(category._id.toString(), {
        ...category.toObject(),
        children: []
      });
    });

    // Second pass: build tree structure
    allCategories.forEach(category => {
      const categoryObj = categoryMap.get(category._id.toString());
      if (category.parent) {
        const parentObj = categoryMap.get(category.parent._id.toString());
        if (parentObj) {
          parentObj.children.push(categoryObj);
        }
      } else {
        rootCategories.push(categoryObj);
      }
    });

    res.json({
      success: true,
      message: "Category tree retrieved successfully",
      data: { categories: rootCategories },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get category tree error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving category tree",
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

    const category = await CategoryModel.findById(id)
      .populate("parent", "name slug");

    if (!category) {
      res.status(404).json({
        success: false,
        message: "Category not found",
      });
      return;
    }

    // Get children count
    const childrenCount = await CategoryModel.countDocuments({ 
      parent: id, 
      isActive: true 
    });

    res.json({
      success: true,
      message: "Category retrieved successfully",
      data: { 
        category: {
          ...category.toObject(),
          childrenCount
        }
      },
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
      isActive: true 
    }).populate("parent", "name slug");

    if (!category) {
      res.status(404).json({
        success: false,
        message: "Category not found",
      });
      return;
    }

    // Get children
    const children = await CategoryModel.find({ 
      parent: category._id, 
      isActive: true 
    }).sort({ sortOrder: 1, name: 1 });

    res.json({
      success: true,
      message: "Category retrieved successfully",
      data: { 
        category: {
          ...category.toObject(),
          children
        }
      },
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
    const {
      name,
      slug,
      description,
      parent,
      isActive = true,
      sortOrder,
      metaTitle,
      metaDescription,
    } = req.body;

    // Validate required fields
    if (!name) {
      res.status(400).json({
        success: false,
        message: "Category name is required",
      });
      return;
    }

    // Validate parent if provided
    if (parent && !Types.ObjectId.isValid(parent)) {
      res.status(400).json({
        success: false,
        message: "Invalid parent category ID",
      });
      return;
    }

    // Check if parent exists
    if (parent) {
      const parentCategory = await CategoryModel.findById(parent);
      if (!parentCategory) {
        res.status(404).json({
          success: false,
          message: "Parent category not found",
        });
        return;
      }
    }

    // Generate slug if not provided
    let finalSlug = slug;
    if (!finalSlug) {
      finalSlug = name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim();
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
      finalSortOrder = await CategoryModel.getNextSortOrder(parent);
    }

    // Create new category
    const categoryData = {
      name: name.trim(),
      slug: finalSlug.toLowerCase().trim(),
      description: description?.trim(),
      parent: parent || null,
      isActive,
      sortOrder: finalSortOrder,
      metaTitle: metaTitle?.trim(),
      metaDescription: metaDescription?.trim(),
    };

    const category = new CategoryModel(categoryData);
    await category.save();

    // Populate parent for response
    await category.populate("parent", "name slug");

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

    // Validate parent if provided
    if (updateData.parent && updateData.parent !== existingCategory.parent?.toString()) {
      if (!Types.ObjectId.isValid(updateData.parent)) {
        res.status(400).json({
          success: false,
          message: "Invalid parent category ID",
        });
        return;
      }

      // Check if parent exists
      const parentCategory = await CategoryModel.findById(updateData.parent);
      if (!parentCategory) {
        res.status(404).json({
          success: false,
          message: "Parent category not found",
        });
        return;
      }

      // Prevent setting self as parent
      if (updateData.parent === id) {
        res.status(400).json({
          success: false,
          message: "Category cannot be its own parent",
        });
        return;
      }

      // Prevent circular references (simplified check)
      let currentParent = await CategoryModel.findById(updateData.parent);
      while (currentParent) {
        if (currentParent._id.toString() === id) {
          res.status(400).json({
            success: false,
            message: "Cannot create circular parent-child relationship",
          });
          return;
        }
        currentParent = currentParent.parent ? 
          await CategoryModel.findById(currentParent.parent) : null;
      }
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
    if (updateData.parent !== undefined) sanitizedUpdateData.parent = updateData.parent || null;
    if (updateData.isActive !== undefined) sanitizedUpdateData.isActive = updateData.isActive;
    if (updateData.sortOrder !== undefined) sanitizedUpdateData.sortOrder = updateData.sortOrder;
    if (updateData.metaTitle !== undefined) sanitizedUpdateData.metaTitle = updateData.metaTitle?.trim();
    if (updateData.metaDescription !== undefined) sanitizedUpdateData.metaDescription = updateData.metaDescription?.trim();

    // Update category
    const updatedCategory = await CategoryModel.findByIdAndUpdate(
      id,
      sanitizedUpdateData,
      {
        new: true,
        runValidators: true,
      }
    ).populate("parent", "name slug");

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
    const { force = "false" } = req.query;

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

    // Check if category has children
    const childrenCount = await CategoryModel.countDocuments({ parent: id });
    if (childrenCount > 0 && force !== "true") {
      res.status(400).json({
        success: false,
        message: "Cannot delete category with children. Use force=true to delete all children as well.",
        data: { childrenCount },
      });
      return;
    }

    if (force === "true" && childrenCount > 0) {
      // Recursively delete all children
      await deleteChildrenRecursively(id);
    }

    // Delete the category
    const deletedCategory = await CategoryModel.findByIdAndDelete(id);

    res.json({
      success: true,
      message: `Category${childrenCount > 0 ? " and children" : ""} deleted successfully`,
      data: { 
        category: deletedCategory,
        deletedChildrenCount: force === "true" ? childrenCount : 0
      },
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

// Helper function to recursively delete children
async function deleteChildrenRecursively(parentId: string): Promise<void> {
  const children = await CategoryModel.find({ parent: parentId });
  
  for (const child of children) {
    await deleteChildrenRecursively(child._id.toString());
    await CategoryModel.findByIdAndDelete(child._id);
  }
}

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

    const updatedCategory = await CategoryModel.findByIdAndUpdate(
      id,
      { isActive: newStatus },
      { new: true }
    ).populate("parent", "name slug");

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
