import { Request, Response } from "express";
import { TopBannerModel, BannerVisibility } from "@/models/TopBanner";
import { Types } from "mongoose";

// GET /api/top-banners - Get all top banners with filtering and pagination
export const getAllTopBanners = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      visibility,
      active,
    } = req.query;

    // Build filter object
    const filter: Record<string, unknown> = {};

    // Filter by visibility
    if (visibility && Object.values(BannerVisibility).includes(visibility as BannerVisibility)) {
      filter.visibility = visibility;
    }

    // Filter by active status (currently active banners)
    if (active === "true") {
      const now = new Date();
      filter.visibility = BannerVisibility.ACTIVE;
      filter.startDate = { $lte: now };
      filter.endDate = { $gte: now };
    }

    // Search functionality
    if (search && typeof search === "string") {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { redirectLink: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sortField = typeof sortBy === "string" ? sortBy : "createdAt";
    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const sortObj: Record<string, 1 | -1> = {};
    sortObj[sortField] = sortDirection;

    // Get banners with pagination
    const banners = await TopBannerModel.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate("desktopBanner", "filename url")
      .populate("tabletBanner", "filename url")
      .populate("mobileBanner", "filename url");

    // Get total count for pagination
    const total = await TopBannerModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      message: "Top banners retrieved successfully",
      data: banners,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get top banners error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving top banners",
      error: err.message,
    });
  }
};

// GET /api/top-banners/:id - Get single top banner by ID
export const getTopBannerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid banner ID format",
      });
      return;
    }

    const banner = await TopBannerModel.findById(id)
      .populate("desktopBanner", "filename url")
      .populate("tabletBanner", "filename url")
      .populate("mobileBanner", "filename url");

    if (!banner) {
      res.status(404).json({
        success: false,
        message: "Top banner not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Top banner retrieved successfully",
      data: { banner },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get top banner by ID error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving top banner",
      error: err.message,
    });
  }
};

// GET /api/top-banners/slug/:slug - Get single top banner by slug
export const getTopBannerBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const banner = await TopBannerModel.findOne({ slug: slug.toLowerCase() })
      .populate("desktopBanner", "filename url")
      .populate("tabletBanner", "filename url")
      .populate("mobileBanner", "filename url");

    if (!banner) {
      res.status(404).json({
        success: false,
        message: "Top banner not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Top banner retrieved successfully",
      data: { banner },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get top banner by slug error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving top banner",
      error: err.message,
    });
  }
};

// GET /api/top-banners/active - Get currently active banners
export const getActiveBanners = async (req: Request, res: Response): Promise<void> => {
  try {
    const banners = await TopBannerModel.getActiveBanners();

    res.json({
      success: true,
      message: "Active banners retrieved successfully",
      data: { banners },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get active banners error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving active banners",
      error: err.message,
    });
  }
};

// POST /api/top-banners - Create new top banner
export const createTopBanner = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      desktopBanner,
      tabletBanner,
      mobileBanner,
      startDate,
      endDate,
      redirectLink,
      visibility = BannerVisibility.INACTIVE,
    } = req.body;

    // Validate required fields
    if (!name) {
      res.status(400).json({
        success: false,
        message: "Banner name is required",
      });
      return;
    }

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
      return;
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
      return;
    }

    // Validate media IDs if provided
    const mediaIds = [desktopBanner, tabletBanner, mobileBanner].filter(Boolean);
    for (const mediaId of mediaIds) {
      if (!Types.ObjectId.isValid(mediaId)) {
        res.status(400).json({
          success: false,
          message: "Invalid media ID format",
        });
        return;
      }
    }

    // Validate visibility
    if (!Object.values(BannerVisibility).includes(visibility)) {
      res.status(400).json({
        success: false,
        message: "Invalid visibility value",
      });
      return;
    }

    // Create new banner
    const bannerData = {
      name: name.trim(),
      desktopBanner: desktopBanner || undefined,
      tabletBanner: tabletBanner || undefined,
      mobileBanner: mobileBanner || undefined,
      startDate: start,
      endDate: end,
      redirectLink: redirectLink?.trim(),
      visibility,
    };

    const banner = new TopBannerModel(bannerData);
    await banner.save();

    // Populate media references before returning
    await banner.populate("desktopBanner tabletBanner mobileBanner");

    res.status(201).json({
      success: true,
      message: "Top banner created successfully",
      data: { banner },
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
        message: "Banner with this name already exists",
      });
      return;
    }

    console.error("Create top banner error:", err);
    res.status(500).json({
      success: false,
      message: "Error creating top banner",
      error: err.message,
    });
  }
};

// PUT /api/top-banners/:id - Update top banner by ID
export const updateTopBanner = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid banner ID format",
      });
      return;
    }

    // Check if banner exists
    const existingBanner = await TopBannerModel.findById(id);
    if (!existingBanner) {
      res.status(404).json({
        success: false,
        message: "Top banner not found",
      });
      return;
    }

    // Validate dates if provided
    if (updateData.startDate && updateData.endDate) {
      const start = new Date(updateData.startDate);
      const end = new Date(updateData.endDate);
      
      if (start >= end) {
        res.status(400).json({
          success: false,
          message: "End date must be after start date",
        });
        return;
      }
    }

    // Validate media IDs if provided
    const mediaFields = ['desktopBanner', 'tabletBanner', 'mobileBanner'];
    for (const field of mediaFields) {
      if (updateData[field] && !Types.ObjectId.isValid(updateData[field])) {
        res.status(400).json({
          success: false,
          message: `Invalid ${field} ID format`,
        });
        return;
      }
    }

    // Validate visibility if provided
    if (updateData.visibility && !Object.values(BannerVisibility).includes(updateData.visibility)) {
      res.status(400).json({
        success: false,
        message: "Invalid visibility value",
      });
      return;
    }

    // Prepare update data
    const sanitizedUpdateData: Record<string, unknown> = {};

    if (updateData.name !== undefined) sanitizedUpdateData.name = updateData.name?.trim();
    if (updateData.desktopBanner !== undefined) sanitizedUpdateData.desktopBanner = updateData.desktopBanner;
    if (updateData.tabletBanner !== undefined) sanitizedUpdateData.tabletBanner = updateData.tabletBanner;
    if (updateData.mobileBanner !== undefined) sanitizedUpdateData.mobileBanner = updateData.mobileBanner;
    if (updateData.startDate !== undefined) sanitizedUpdateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate !== undefined) sanitizedUpdateData.endDate = new Date(updateData.endDate);
    if (updateData.redirectLink !== undefined) sanitizedUpdateData.redirectLink = updateData.redirectLink?.trim();
    if (updateData.visibility !== undefined) sanitizedUpdateData.visibility = updateData.visibility;

    // Update banner
    const updatedBanner = await TopBannerModel.findByIdAndUpdate(
      id,
      sanitizedUpdateData,
      {
        new: true,
        runValidators: true,
      }
    ).populate("desktopBanner tabletBanner mobileBanner");

    res.json({
      success: true,
      message: "Top banner updated successfully",
      data: { banner: updatedBanner },
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
        message: "Banner with this name already exists",
      });
      return;
    }

    console.error("Update top banner error:", err);
    res.status(500).json({
      success: false,
      message: "Error updating top banner",
      error: err.message,
    });
  }
};

// DELETE /api/top-banners/:id - Delete top banner by ID
export const deleteTopBanner = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid banner ID format",
      });
      return;
    }

    // Check if banner exists
    const existingBanner = await TopBannerModel.findById(id);
    if (!existingBanner) {
      res.status(404).json({
        success: false,
        message: "Top banner not found",
      });
      return;
    }

    // Delete the banner
    const deletedBanner = await TopBannerModel.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Top banner deleted successfully",
      data: { banner: deletedBanner },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Delete top banner error:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting top banner",
      error: err.message,
    });
  }
};

// PATCH /api/top-banners/:id/toggle-visibility - Toggle banner visibility
export const toggleBannerVisibility = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid banner ID format",
      });
      return;
    }

    const banner = await TopBannerModel.findById(id);

    if (!banner) {
      res.status(404).json({
        success: false,
        message: "Top banner not found",
      });
      return;
    }

    // Toggle visibility
    const newVisibility = banner.visibility === BannerVisibility.ACTIVE 
      ? BannerVisibility.INACTIVE 
      : BannerVisibility.ACTIVE;

    const updatedBanner = await TopBannerModel.findByIdAndUpdate(
      id,
      { visibility: newVisibility },
      { new: true }
    ).populate("desktopBanner tabletBanner mobileBanner");

    res.json({
      success: true,
      message: `Banner ${newVisibility === BannerVisibility.ACTIVE ? "activated" : "deactivated"} successfully`,
      data: { banner: updatedBanner },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Toggle banner visibility error:", err);
    res.status(500).json({
      success: false,
      message: "Error updating banner visibility",
      error: err.message,
    });
  }
};

// PATCH /api/top-banners/:id/increment-clicks - Increment banner click count
export const incrementClicks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid banner ID format",
      });
      return;
    }

    const banner = await TopBannerModel.findById(id);

    if (!banner) {
      res.status(404).json({
        success: false,
        message: "Top banner not found",
      });
      return;
    }

    const updatedBanner = await banner.incrementClicks();

    res.json({
      success: true,
      message: "Banner click count incremented successfully",
      data: { banner: updatedBanner },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Increment clicks error:", err);
    res.status(500).json({
      success: false,
      message: "Error incrementing click count",
      error: err.message,
    });
  }
};

// PATCH /api/top-banners/:id/increment-impressions - Increment banner impression count
export const incrementImpressions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid banner ID format",
      });
      return;
    }

    const banner = await TopBannerModel.findById(id);

    if (!banner) {
      res.status(404).json({
        success: false,
        message: "Top banner not found",
      });
      return;
    }

    const updatedBanner = await banner.incrementImpressions();

    res.json({
      success: true,
      message: "Banner impression count incremented successfully",
      data: { banner: updatedBanner },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Increment impressions error:", err);
    res.status(500).json({
      success: false,
      message: "Error incrementing impression count",
      error: err.message,
    });
  }
};

// GET /api/top-banners/search - Search banners
export const searchBanners = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== "string") {
      res.status(400).json({
        success: false,
        message: "Search query is required",
      });
      return;
    }

    const banners = await TopBannerModel.searchBanners(query);

    res.json({
      success: true,
      message: "Banner search completed successfully",
      data: { banners },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Search banners error:", err);
    res.status(500).json({
      success: false,
      message: "Error searching banners",
      error: err.message,
    });
  }
};
