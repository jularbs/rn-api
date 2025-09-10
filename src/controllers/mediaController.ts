import { Request, Response } from "express";
import { MediaModel } from "../models/Media";
import { Types } from "mongoose";

// GET /api/media - Get all media files with filtering and pagination
export const getAllMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      mimeType,
      bucket,
      fileType,
    } = req.query;

    // Build filter object
    const filter: Record<string, unknown> = {};

    // Filter by MIME type
    if (mimeType && typeof mimeType === "string") {
      filter.mimeType = mimeType;
    }

    // Filter by bucket
    if (bucket && typeof bucket === "string") {
      filter.bucket = bucket;
    }

    // Filter by file type category
    if (fileType && typeof fileType === "string") {
      switch (fileType.toLowerCase()) {
        case "image":
          filter.mimeType = { $regex: "^image/" };
          break;
        case "video":
          filter.mimeType = { $regex: "^video/" };
          break;
        case "audio":
          filter.mimeType = { $regex: "^audio/" };
          break;
        case "document": {
          const documentTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain",
            "text/csv"
          ];
          filter.mimeType = { $in: documentTypes };
          break;
        }
      }
    }

    // Search functionality
    if (search && typeof search === "string") {
      filter.$or = [
        { originalName: { $regex: search, $options: "i" } },
        { alt: { $regex: search, $options: "i" } },
        { caption: { $regex: search, $options: "i" } },
        { key: { $regex: search, $options: "i" } },
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

    // Get media files with pagination
    const mediaFiles = await MediaModel.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await MediaModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      message: "Media files retrieved successfully",
      data: {
        media: mediaFiles,
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
    console.error("Get media files error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving media files",
      error: err.message,
    });
  }
};

// GET /api/media/:id - Get single media file by ID
export const getMediaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid media ID format",
      });
      return;
    }

    const mediaFile = await MediaModel.findById(id);

    if (!mediaFile) {
      res.status(404).json({
        success: false,
        message: "Media file not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Media file retrieved successfully",
      data: { media: mediaFile },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get media file by ID error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving media file",
      error: err.message,
    });
  }
};

// GET /api/media/key/:key - Get single media file by S3 key
export const getMediaByKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;

    const mediaFile = await MediaModel.findByKey(decodeURIComponent(key));

    if (!mediaFile) {
      res.status(404).json({
        success: false,
        message: "Media file not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Media file retrieved successfully",
      data: { media: mediaFile },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get media file by key error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving media file",
      error: err.message,
    });
  }
};

// POST /api/media - Create new media file record
export const createMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      originalName,
      key,
      bucket,
      url,
      mimeType,
      size,
      alt,
      caption,
    } = req.body;

    // Validate required fields
    if (!originalName) {
      res.status(400).json({
        success: false,
        message: "Original name is required",
      });
      return;
    }

    if (!key) {
      res.status(400).json({
        success: false,
        message: "S3 key is required",
      });
      return;
    }

    if (!bucket) {
      res.status(400).json({
        success: false,
        message: "S3 bucket is required",
      });
      return;
    }

    if (!mimeType) {
      res.status(400).json({
        success: false,
        message: "MIME type is required",
      });
      return;
    }

    if (size === undefined || size < 0) {
      res.status(400).json({
        success: false,
        message: "Valid file size is required",
      });
      return;
    }

    // Check if key already exists
    const existingMedia = await MediaModel.findByKey(key);
    if (existingMedia) {
      res.status(409).json({
        success: false,
        message: "Media file with this key already exists",
      });
      return;
    }

    // Create new media file record
    const mediaData = {
      originalName: originalName.trim(),
      key: key.trim(),
      bucket: bucket.trim(),
      url: url?.trim(),
      mimeType: mimeType.trim(),
      size: parseInt(size, 10),
      alt: alt?.trim(),
      caption: caption?.trim(),
    };

    const mediaFile = new MediaModel(mediaData);
    await mediaFile.save();

    res.status(201).json({
      success: true,
      message: "Media file record created successfully",
      data: { media: mediaFile },
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
        message: "Media file with this key already exists",
      });
      return;
    }

    console.error("Create media file error:", err);
    res.status(500).json({
      success: false,
      message: "Error creating media file record",
      error: err.message,
    });
  }
};

// PUT /api/media/:id - Update media file by ID
export const updateMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid media ID format",
      });
      return;
    }

    // Check if media file exists
    const existingMedia = await MediaModel.findById(id);
    if (!existingMedia) {
      res.status(404).json({
        success: false,
        message: "Media file not found",
      });
      return;
    }

    // Check if key is being updated and if it already exists
    if (updateData.key && updateData.key !== existingMedia.key) {
      const keyExists = await MediaModel.findOne({
        key: updateData.key,
        _id: { $ne: id },
      });

      if (keyExists) {
        res.status(409).json({
          success: false,
          message: "Media file with this key already exists",
        });
        return;
      }
    }

    // Prepare update data
    const sanitizedUpdateData: Record<string, unknown> = {};

    if (updateData.originalName !== undefined) sanitizedUpdateData.originalName = updateData.originalName?.trim();
    if (updateData.key !== undefined) sanitizedUpdateData.key = updateData.key?.trim();
    if (updateData.bucket !== undefined) sanitizedUpdateData.bucket = updateData.bucket?.trim();
    if (updateData.url !== undefined) sanitizedUpdateData.url = updateData.url?.trim();
    if (updateData.mimeType !== undefined) sanitizedUpdateData.mimeType = updateData.mimeType?.trim();
    if (updateData.size !== undefined) sanitizedUpdateData.size = parseInt(updateData.size, 10);
    if (updateData.alt !== undefined) sanitizedUpdateData.alt = updateData.alt?.trim();
    if (updateData.caption !== undefined) sanitizedUpdateData.caption = updateData.caption?.trim();

    // Update media file
    const updatedMedia = await MediaModel.findByIdAndUpdate(
      id,
      sanitizedUpdateData,
      {
        new: true,
        runValidators: true,
      }
    );

    res.json({
      success: true,
      message: "Media file updated successfully",
      data: { media: updatedMedia },
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
        message: "Media file with this key already exists",
      });
      return;
    }

    console.error("Update media file error:", err);
    res.status(500).json({
      success: false,
      message: "Error updating media file",
      error: err.message,
    });
  }
};

// DELETE /api/media/:id - Delete media file by ID
export const deleteMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid media ID format",
      });
      return;
    }

    // Check if media file exists
    const existingMedia = await MediaModel.findById(id);
    if (!existingMedia) {
      res.status(404).json({
        success: false,
        message: "Media file not found",
      });
      return;
    }

    // Delete the media file record
    const deletedMedia = await MediaModel.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Media file record deleted successfully",
      data: { media: deletedMedia },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Delete media file error:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting media file record",
      error: err.message,
    });
  }
};

// GET /api/media/search - Search media files
export const searchMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== "string") {
      res.status(400).json({
        success: false,
        message: "Search query is required",
      });
      return;
    }

    const mediaFiles = await MediaModel.search(query);

    res.json({
      success: true,
      message: "Media search completed successfully",
      data: { media: mediaFiles },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Search media files error:", err);
    res.status(500).json({
      success: false,
      message: "Error searching media files",
      error: err.message,
    });
  }
};

// GET /api/media/types/:type - Get media files by type
export const getMediaByType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.params;
    let mediaFiles;

    switch (type.toLowerCase()) {
      case "images":
        mediaFiles = await MediaModel.findImages();
        break;
      case "videos":
        mediaFiles = await MediaModel.findVideos();
        break;
      case "audio":
        mediaFiles = await MediaModel.findAudio();
        break;
      case "documents":
        mediaFiles = await MediaModel.findDocuments();
        break;
      default:
        res.status(400).json({
          success: false,
          message: "Invalid media type. Use: images, videos, audio, or documents",
        });
        return;
    }

    res.json({
      success: true,
      message: `${type} files retrieved successfully`,
      data: { media: mediaFiles },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get media by type error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving media files by type",
      error: err.message,
    });
  }
};

// GET /api/media/bucket/:bucket - Get media files by S3 bucket
export const getMediaByBucket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bucket } = req.params;
    const { 
      page = "1", 
      limit = "10",
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    const mediaFiles = await MediaModel.findByBucket(decodeURIComponent(bucket));

    // Apply pagination and sorting to the results
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sortField = typeof sortBy === "string" ? sortBy : "createdAt";
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    // Manual sorting since we already have the results
    mediaFiles.sort((a, b) => {
      const aValue = a[sortField as keyof typeof a];
      const bValue = b[sortField as keyof typeof b];
      
      if (aValue < bValue) return -1 * sortDirection;
      if (aValue > bValue) return 1 * sortDirection;
      return 0;
    });

    // Apply pagination
    const paginatedFiles = mediaFiles.slice(skip, skip + limitNum);
    const total = mediaFiles.length;
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      message: `Media files from bucket '${bucket}' retrieved successfully`,
      data: {
        media: paginatedFiles,
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
    console.error("Get media by bucket error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving media files by bucket",
      error: err.message,
    });
  }
};

// GET /api/media/stats/basic - Get basic media statistics
export const getBasicStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await MediaModel.getBasicStats();

    res.json({
      success: true,
      message: "Basic media statistics retrieved successfully",
      data: { stats },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get basic stats error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving basic media statistics",
      error: err.message,
    });
  }
};

// GET /api/media/stats/file-types - Get file type statistics
export const getFileTypeStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await MediaModel.getFileTypeStats();

    res.json({
      success: true,
      message: "File type statistics retrieved successfully",
      data: { stats },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get file type stats error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving file type statistics",
      error: err.message,
    });
  }
};

// GET /api/media/stats/buckets - Get bucket statistics
export const getBucketStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await MediaModel.getBucketStats();

    res.json({
      success: true,
      message: "Bucket statistics retrieved successfully",
      data: { stats },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get bucket stats error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving bucket statistics",
      error: err.message,
    });
  }
};
