import { Request, Response } from "express";
import { StationModel } from "../models/Station";
import { Types } from "mongoose";
import { CreateStationRequest, UpdateStationRequest } from "@/types";

// GET /api/stations - Get all stations
export const getAllStations = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      status,
      locationGroup,
      page = "1",
      limit = "10",
      search,
    } = req.query;

    // Build filter object
    const filter: Record<string, unknown> = {};

    if (status && typeof status === "string") {
      filter.status = status;
    }

    if (locationGroup && typeof locationGroup === "string") {
      filter.locationGroup = locationGroup;
    }

    if (search && typeof search === "string") {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { frequency: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Get stations with pagination
    const stations = await StationModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await StationModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      message: "Stations retrieved successfully",
      data: {
        stations,
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
    console.error("Get stations error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving stations",
      error: err.message,
    });
  }
};

// GET /api/stations/:id - Get single station by ID
export const getStationById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid station ID format",
      });
      return;
    }

    const station = await StationModel.findById(id);

    if (!station) {
      res.status(404).json({
        success: false,
        message: "Station not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Station retrieved successfully",
      data: { station },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get station by ID error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving station",
      error: err.message,
    });
  }
};

// GET /api/stations/slug/:slug - Get single station by slug
export const getStationBySlug = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { slug } = req.params;

    const station = await StationModel.findOne({ slug: slug.toLowerCase() });

    if (!station) {
      res.status(404).json({
        success: false,
        message: "Station not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Station retrieved successfully",
      data: { station },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get station by slug error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving station",
      error: err.message,
    });
  }
};

// POST /api/stations - Create new station
export const createStation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      slug,
      frequency,
      address,
      locationGroup,
      audioStreamURL,
      videoStreamURL,
      status = "active",
    }: CreateStationRequest = req.body;

    // Validate required fields
    if (!name || !slug || !frequency || !locationGroup) {
      res.status(400).json({
        success: false,
        message: "Name, slug, frequency, and location group are required",
      });
      return;
    }

    // Check if station with slug already exists
    const existingStation = await StationModel.findOne({
      slug: slug.toLowerCase(),
    });
    if (existingStation) {
      res.status(409).json({
        success: false,
        message: "Station with this slug already exists",
      });
      return;
    }

    // Create new station
    const stationData = {
      name: name.trim(),
      slug: slug.toLowerCase().trim(),
      frequency: frequency.trim(),
      address: address?.trim(),
      locationGroup,
      audioStreamURL: audioStreamURL?.trim(),
      videoStreamURL: videoStreamURL?.trim(),
      status,
    };

    const station = new StationModel(stationData);
    await station.save();

    res.status(201).json({
      success: true,
      message: "Station created successfully",
      data: { station },
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
        message: "Station with this slug already exists",
      });
      return;
    }

    console.error("Create station error:", err);
    res.status(500).json({
      success: false,
      message: "Error creating station",
      error: err.message,
    });
  }
};

// PUT /api/stations/:id - Update station by ID
export const updateStation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateStationRequest = req.body;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid station ID format",
      });
      return;
    }

    // Check if station exists
    const existingStation = await StationModel.findById(id);
    if (!existingStation) {
      res.status(404).json({
        success: false,
        message: "Station not found",
      });
      return;
    }

    // If slug is being updated, check for uniqueness
    if (updateData.slug && updateData.slug !== existingStation.slug) {
      const slugExists = await StationModel.findOne({
        slug: updateData.slug.toLowerCase(),
        _id: { $ne: id },
      });

      if (slugExists) {
        res.status(409).json({
          success: false,
          message: "Station with this slug already exists",
        });
        return;
      }
    }

    // Prepare update data
    const sanitizedUpdateData: Partial<CreateStationRequest> = {};

    if (updateData.name) sanitizedUpdateData.name = updateData.name.trim();
    if (updateData.slug)
      sanitizedUpdateData.slug = updateData.slug.toLowerCase().trim();
    if (updateData.frequency)
      sanitizedUpdateData.frequency = updateData.frequency.trim();
    if (updateData.address !== undefined)
      sanitizedUpdateData.address = updateData.address?.trim();
    if (updateData.locationGroup)
      sanitizedUpdateData.locationGroup = updateData.locationGroup;
    if (updateData.audioStreamURL !== undefined)
      sanitizedUpdateData.audioStreamURL = updateData.audioStreamURL?.trim();
    if (updateData.videoStreamURL !== undefined)
      sanitizedUpdateData.videoStreamURL = updateData.videoStreamURL?.trim();
    if (updateData.status) sanitizedUpdateData.status = updateData.status;

    // Update station
    const updatedStation = await StationModel.findByIdAndUpdate(
      id,
      sanitizedUpdateData,
      {
        new: true,
        runValidators: true,
      }
    );

    res.json({
      success: true,
      message: "Station updated successfully",
      data: { station: updatedStation },
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
        message: "Station with this slug already exists",
      });
      return;
    }

    console.error("Update station error:", err);
    res.status(500).json({
      success: false,
      message: "Error updating station",
      error: err.message,
    });
  }
};

// DELETE /api/stations/:id - Delete station by ID
export const deleteStation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid station ID format",
      });
      return;
    }

    const deletedStation = await StationModel.findByIdAndDelete(id);

    if (!deletedStation) {
      res.status(404).json({
        success: false,
        message: "Station not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Station deleted successfully",
      data: { station: deletedStation },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Delete station error:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting station",
      error: err.message,
    });
  }
};

// PATCH /api/stations/:id/status - Toggle station status
export const toggleStationStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid station ID format",
      });
      return;
    }

    const station = await StationModel.findById(id);

    if (!station) {
      res.status(404).json({
        success: false,
        message: "Station not found",
      });
      return;
    }

    // Toggle status
    const newStatus = station.status === "active" ? "inactive" : "active";

    const updatedStation = await StationModel.findByIdAndUpdate(
      id,
      { status: newStatus },
      { new: true }
    );

    res.json({
      success: true,
      message: `Station ${
        newStatus === "active" ? "activated" : "deactivated"
      } successfully`,
      data: { station: updatedStation },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Toggle station status error:", err);
    res.status(500).json({
      success: false,
      message: "Error updating station status",
      error: err.message,
    });
  }
};
