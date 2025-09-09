import { Request, Response } from "express";
import { OptionsModel } from "../models/Options";
import { Types } from "mongoose";

// GET /api/options - Get all options with filtering and pagination
export const getAllOptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      search,
      sortBy = "key",
      sortOrder = "asc",
      updatedBy,
      hasMedia,
    } = req.query;

    // Build filter object
    const filter: Record<string, unknown> = {};

    // Filter by updatedBy
    if (updatedBy && typeof updatedBy === "string") {
      if (Types.ObjectId.isValid(updatedBy)) {
        filter.updatedBy = new Types.ObjectId(updatedBy);
      }
    }

    // Filter by media presence
    if (hasMedia !== undefined) {
      if (hasMedia === "true") {
        filter.media = { $exists: true, $ne: null };
      } else if (hasMedia === "false") {
        filter.media = { $exists: false };
      }
    }

    // Search functionality
    if (search && typeof search === "string") {
      filter.$or = [
        { key: { $regex: search, $options: "i" } },
        { value: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sortField = typeof sortBy === "string" ? sortBy : "key";
    const sortDirection = sortOrder === "desc" ? -1 : 1;
    const sortObj: Record<string, 1 | -1> = {};
    sortObj[sortField] = sortDirection;

    // Get options with pagination
    const options = await OptionsModel.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate("updatedBy", "name email")
      .populate("media", "filename url");

    // Get total count for pagination
    const total = await OptionsModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      message: "Options retrieved successfully",
      data: {
        options,
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
    console.error("Get options error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving options",
      error: err.message,
    });
  }
};

// GET /api/options/:key - Get single option by key
export const getOptionByKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;

    const option = await OptionsModel.getByKey(key);

    if (!option) {
      res.status(404).json({
        success: false,
        message: "Option not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Option retrieved successfully",
      data: { option },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get option by key error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving option",
      error: err.message,
    });
  }
};

// POST /api/options - Create or update option
export const createOrUpdateOption = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, value, media } = req.body;

    // Validate required fields
    if (!key) {
      res.status(400).json({
        success: false,
        message: "Option key is required",
      });
      return;
    }

    if (!value) {
      res.status(400).json({
        success: false,
        message: "Option value is required",
      });
      return;
    }

    // Get user ID from authenticated request
    const updatedBy = req.user?._id;
    if (!updatedBy) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    // Validate media ID if provided
    if (media && !Types.ObjectId.isValid(media)) {
      res.status(400).json({
        success: false,
        message: "Invalid media ID format",
      });
      return;
    }

    // Create or update option
    const option = await OptionsModel.setOption(
      key.trim(),
      value.trim(),
      updatedBy,
      media
    );

    res.status(201).json({
      success: true,
      message: "Option created/updated successfully",
      data: { option },
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
        message: "Option with this key already exists",
      });
      return;
    }

    console.error("Create/update option error:", err);
    res.status(500).json({
      success: false,
      message: "Error creating/updating option",
      error: err.message,
    });
  }
};

// PUT /api/options/:key - Update option by key
export const updateOption = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const { value, media } = req.body;

    // Check if option exists
    const existingOption = await OptionsModel.getByKey(key);
    if (!existingOption) {
      res.status(404).json({
        success: false,
        message: "Option not found",
      });
      return;
    }

    // Validate required fields
    if (!value) {
      res.status(400).json({
        success: false,
        message: "Option value is required",
      });
      return;
    }

    // Get user ID from authenticated request
    const updatedBy = req.user?._id;
    if (!updatedBy) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    // Validate media ID if provided
    if (media && !Types.ObjectId.isValid(media)) {
      res.status(400).json({
        success: false,
        message: "Invalid media ID format",
      });
      return;
    }

    // Update option
    const updatedOption = await OptionsModel.setOption(
      key,
      value.trim(),
      updatedBy,
      media
    );

    res.json({
      success: true,
      message: "Option updated successfully",
      data: { option: updatedOption },
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

    console.error("Update option error:", err);
    res.status(500).json({
      success: false,
      message: "Error updating option",
      error: err.message,
    });
  }
};

// DELETE /api/options/:key - Delete option by key
export const deleteOption = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;

    // Check if option exists
    const existingOption = await OptionsModel.getByKey(key);
    if (!existingOption) {
      res.status(404).json({
        success: false,
        message: "Option not found",
      });
      return;
    }

    // Delete the option
    const deletedOption = await OptionsModel.deleteByKey(key);

    res.json({
      success: true,
      message: "Option deleted successfully",
      data: { option: deletedOption },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Delete option error:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting option",
      error: err.message,
    });
  }
};

// POST /api/options/bulk - Bulk update options
export const bulkUpdateOptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400).json({
        success: false,
        message: "Updates array is required and cannot be empty",
      });
      return;
    }

    // Get user ID from authenticated request
    const updatedBy = req.user?._id;
    if (!updatedBy) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    // Add updatedBy to all updates
    const updatesWithUser = updates.map((update: { key: string; value: string; media?: string }) => ({
      ...update,
      updatedBy,
    }));

    // Validate all updates
    for (const update of updatesWithUser) {
      if (!update.key || !update.value) {
        res.status(400).json({
          success: false,
          message: "Each update must have key and value",
        });
        return;
      }
    }

    const result = await OptionsModel.bulkUpdateOptions(updatesWithUser);

    res.json({
      success: true,
      message: "Options bulk updated successfully",
      data: {
        modifiedCount: result.modifiedCount,
        insertedCount: result.insertedCount,
        upsertedCount: result.upsertedCount,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Bulk update options error:", err);
    res.status(500).json({
      success: false,
      message: "Error bulk updating options",
      error: err.message,
    });
  }
};

// GET /api/options/search - Search options
export const searchOptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== "string") {
      res.status(400).json({
        success: false,
        message: "Search query is required",
      });
      return;
    }

    const options = await OptionsModel.searchOptions(query);

    res.json({
      success: true,
      message: "Options search completed successfully",
      data: { options },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Search options error:", err);
    res.status(500).json({
      success: false,
      message: "Error searching options",
      error: err.message,
    });
  }
};
