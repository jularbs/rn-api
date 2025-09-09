//TODOS: Code Review on all functions
import { Request, Response } from "express";
import { TagModel } from "../models/Tag";
import { Types } from "mongoose";

// GET /api/tags - Get all tags with filtering and pagination
export const getAllTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = "1", 
      limit = "10", 
      search,
      sortBy = "name",
      sortOrder = "asc",
      minUsage,
      maxUsage,
      color
    } = req.query;

    // Build filter object
    const filter: Record<string, unknown> = {};

    // Filter by usage count range
    if (minUsage !== undefined || maxUsage !== undefined) {
      const usageFilter: Record<string, number> = {};
      
      if (minUsage !== undefined) {
        const min = parseInt(minUsage as string, 10);
        if (!isNaN(min)) {
          usageFilter.$gte = min;
        }
      }
      
      if (maxUsage !== undefined) {
        const max = parseInt(maxUsage as string, 10);
        if (!isNaN(max)) {
          usageFilter.$lte = max;
        }
      }
      
      if (Object.keys(usageFilter).length > 0) {
        filter.usageCount = usageFilter;
      }
    }

    // Filter by color
    if (color && typeof color === "string") {
      filter.color = color;
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
    const sortField = typeof sortBy === "string" ? sortBy : "name";
    const sortDirection = sortOrder === "desc" ? -1 : 1;
    const sortObj: Record<string, 1 | -1> = {};
    sortObj[sortField] = sortDirection;

    // Get tags with pagination
    const tags = await TagModel.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await TagModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      message: "Tags retrieved successfully",
      data: {
        tags,
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
    console.error("Get tags error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving tags",
      error: err.message,
    });
  }
};

// GET /api/tags/popular - Get popular tags
export const getPopularTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = "10" } = req.query;
    const limitNum = parseInt(limit as string, 10) || 10;

    const tags = await TagModel.findPopular(limitNum);

    res.json({
      success: true,
      message: "Popular tags retrieved successfully",
      data: { tags },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get popular tags error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving popular tags",
      error: err.message,
    });
  }
};

// GET /api/tags/trending - Get trending tags
export const getTrendingTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const { days = "30", limit = "10" } = req.query;
    const daysNum = parseInt(days as string, 10) || 30;
    const limitNum = parseInt(limit as string, 10) || 10;

    const tags = await TagModel.findTrending(daysNum, limitNum);

    res.json({
      success: true,
      message: "Trending tags retrieved successfully",
      data: { tags },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get trending tags error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving trending tags",
      error: err.message,
    });
  }
};

// GET /api/tags/stats - Get tag statistics
export const getTagStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await TagModel.getTagStats();
    const distribution = await TagModel.getUsageDistribution();

    res.json({
      success: true,
      message: "Tag statistics retrieved successfully",
      data: { 
        stats,
        usageDistribution: distribution
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get tag stats error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving tag statistics",
      error: err.message,
    });
  }
};

// GET /api/tags/:id - Get single tag by ID
export const getTagById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid tag ID format",
      });
      return;
    }

    const tag = await TagModel.findById(id);

    if (!tag) {
      res.status(404).json({
        success: false,
        message: "Tag not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Tag retrieved successfully",
      data: { tag },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get tag by ID error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving tag",
      error: err.message,
    });
  }
};

// GET /api/tags/slug/:slug - Get single tag by slug
export const getTagBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const tag = await TagModel.findOne({ 
      slug: slug.toLowerCase()
    });

    if (!tag) {
      res.status(404).json({
        success: false,
        message: "Tag not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Tag retrieved successfully",
      data: { tag },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get tag by slug error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving tag",
      error: err.message,
    });
  }
};

// POST /api/tags - Create new tag
export const createTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      slug,
      description,
      color,
      metaTitle,
      metaDescription,
    } = req.body;

    // Validate required fields
    if (!name) {
      res.status(400).json({
        success: false,
        message: "Tag name is required",
      });
      return;
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
    const existingTag = await TagModel.findOne({
      slug: finalSlug.toLowerCase(),
    });
    if (existingTag) {
      res.status(409).json({
        success: false,
        message: "Tag with this slug already exists",
      });
      return;
    }

    // Validate color format if provided
    if (color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
      res.status(400).json({
        success: false,
        message: "Color must be a valid hex color code (e.g., #FF0000)",
      });
      return;
    }

    // Create new tag
    const tagData = {
      name: name.trim(),
      slug: finalSlug.toLowerCase().trim(),
      description: description?.trim(),
      color: color?.trim(),
      metaTitle: metaTitle?.trim(),
      metaDescription: metaDescription?.trim(),
    };

    const tag = new TagModel(tagData);
    await tag.save();

    res.status(201).json({
      success: true,
      message: "Tag created successfully",
      data: { tag },
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
        message: "Tag with this slug already exists",
      });
      return;
    }

    console.error("Create tag error:", err);
    res.status(500).json({
      success: false,
      message: "Error creating tag",
      error: err.message,
    });
  }
};

// POST /api/tags/batch - Create multiple tags
export const createTagsBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { names } = req.body;

    if (!Array.isArray(names) || names.length === 0) {
      res.status(400).json({
        success: false,
        message: "Names array is required and cannot be empty",
      });
      return;
    }

    const tags = await TagModel.findOrCreateByNames(names);

    res.status(201).json({
      success: true,
      message: "Tags created/found successfully",
      data: { tags },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Create tags batch error:", err);
    res.status(500).json({
      success: false,
      message: "Error creating tags",
      error: err.message,
    });
  }
};

// PUT /api/tags/:id - Update tag by ID
export const updateTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid tag ID format",
      });
      return;
    }

    // Check if tag exists
    const existingTag = await TagModel.findById(id);
    if (!existingTag) {
      res.status(404).json({
        success: false,
        message: "Tag not found",
      });
      return;
    }

    // Check slug uniqueness if being updated
    if (updateData.slug && updateData.slug !== existingTag.slug) {
      const slugExists = await TagModel.findOne({
        slug: updateData.slug.toLowerCase(),
        _id: { $ne: id },
      });

      if (slugExists) {
        res.status(409).json({
          success: false,
          message: "Tag with this slug already exists",
        });
        return;
      }
    }

    // Validate color format if provided
    if (updateData.color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(updateData.color)) {
      res.status(400).json({
        success: false,
        message: "Color must be a valid hex color code (e.g., #FF0000)",
      });
      return;
    }

    // Prepare update data
    const sanitizedUpdateData: Record<string, unknown> = {};

    if (updateData.name !== undefined) sanitizedUpdateData.name = updateData.name?.trim();
    if (updateData.slug !== undefined) sanitizedUpdateData.slug = updateData.slug?.toLowerCase().trim();
    if (updateData.description !== undefined) sanitizedUpdateData.description = updateData.description?.trim();
    if (updateData.color !== undefined) sanitizedUpdateData.color = updateData.color?.trim();
    if (updateData.metaTitle !== undefined) sanitizedUpdateData.metaTitle = updateData.metaTitle?.trim();
    if (updateData.metaDescription !== undefined) sanitizedUpdateData.metaDescription = updateData.metaDescription?.trim();

    // Update tag
    const updatedTag = await TagModel.findByIdAndUpdate(
      id,
      sanitizedUpdateData,
      {
        new: true,
        runValidators: true,
      }
    );

    res.json({
      success: true,
      message: "Tag updated successfully",
      data: { tag: updatedTag },
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
        message: "Tag with this slug already exists",
      });
      return;
    }

    console.error("Update tag error:", err);
    res.status(500).json({
      success: false,
      message: "Error updating tag",
      error: err.message,
    });
  }
};

// DELETE /api/tags/:id - Delete tag by ID
export const deleteTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { force = "false" } = req.query;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid tag ID format",
      });
      return;
    }

    // Check if tag exists
    const tag = await TagModel.findById(id);
    if (!tag) {
      res.status(404).json({
        success: false,
        message: "Tag not found",
      });
      return;
    }

    // Check if tag is being used
    if (tag.usageCount > 0 && force !== "true") {
      res.status(400).json({
        success: false,
        message: "Cannot delete tag that is currently in use. Use force=true to delete anyway.",
        data: { usageCount: tag.usageCount },
      });
      return;
    }

    // Delete the tag
    const deletedTag = await TagModel.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Tag deleted successfully",
      data: { tag: deletedTag },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Delete tag error:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting tag",
      error: err.message,
    });
  }
};

// PATCH /api/tags/:id/toggle-status - Toggle tag active status
// PATCH /api/tags/:id/increment-usage - Increment tag usage count
export const incrementTagUsage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid tag ID format",
      });
      return;
    }

    const tag = await TagModel.findById(id);

    if (!tag) {
      res.status(404).json({
        success: false,
        message: "Tag not found",
      });
      return;
    }

    const updatedTag = await tag.incrementUsage();

    res.json({
      success: true,
      message: "Tag usage incremented successfully",
      data: { tag: updatedTag },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Increment tag usage error:", err);
    res.status(500).json({
      success: false,
      message: "Error incrementing tag usage",
      error: err.message,
    });
  }
};

// PATCH /api/tags/:id/decrement-usage - Decrement tag usage count
export const decrementTagUsage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid tag ID format",
      });
      return;
    }

    const tag = await TagModel.findById(id);

    if (!tag) {
      res.status(404).json({
        success: false,
        message: "Tag not found",
      });
      return;
    }

    const updatedTag = await tag.decrementUsage();

    res.json({
      success: true,
      message: "Tag usage decremented successfully",
      data: { tag: updatedTag },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Decrement tag usage error:", err);
    res.status(500).json({
      success: false,
      message: "Error decrementing tag usage",
      error: err.message,
    });
  }
};

// POST /api/tags/bulk-usage - Bulk update tag usage
export const bulkUpdateTagUsage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tagIds, operation } = req.body;

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      res.status(400).json({
        success: false,
        message: "Tag IDs array is required and cannot be empty",
      });
      return;
    }

    if (!["increment", "decrement"].includes(operation)) {
      res.status(400).json({
        success: false,
        message: "Operation must be either 'increment' or 'decrement'",
      });
      return;
    }

    // Validate all tag IDs
    for (const id of tagIds) {
      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: `Invalid tag ID format: ${id}`,
        });
        return;
      }
    }

    let result;
    if (operation === "increment") {
      result = await TagModel.bulkIncrementUsage(tagIds);
    } else {
      result = await TagModel.bulkDecrementUsage(tagIds);
    }

    res.json({
      success: true,
      message: `Tag usage ${operation}ed successfully`,
      data: { 
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Bulk update tag usage error:", err);
    res.status(500).json({
      success: false,
      message: "Error updating tag usage",
      error: err.message,
    });
  }
};

// DELETE /api/tags/cleanup-unused - Cleanup unused tags
export const cleanupUnusedTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const { days = "90" } = req.query;
    const daysNum = parseInt(days as string, 10) || 90;

    const result = await TagModel.cleanupUnused(daysNum);

    res.json({
      success: true,
      message: "Unused tags cleaned up successfully",
      data: { deletedCount: result.deletedCount },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Cleanup unused tags error:", err);
    res.status(500).json({
      success: false,
      message: "Error cleaning up unused tags",
      error: err.message,
    });
  }
};
