import { Request, Response } from "express";
import { MediaModel } from "@/models/Media";
import { Types } from "mongoose";
import formidable from "formidable";
import fs from "fs";
import s3Helper from "@/utils/s3Helper";

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
            "text/csv",
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
    const mediaFiles = await MediaModel.find(filter).sort(sortObj).skip(skip).limit(limitNum);

    // Get total count for pagination
    const total = await MediaModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      message: "Media files retrieved successfully",
      data: mediaFiles,
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
    console.error("Get media files error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving media files",
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
      data: mediaFile,
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
      data: deletedMedia,
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
      data: mediaFiles,
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

//POST /api/media - Create media for image uploading
export const uploadMediaFromEditor = async (req: Request, res: Response): Promise<void> => {
  try {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ mimetype }) => {
        // Accept only image files
        return mimetype?.startsWith("image/") || false;
      },
    });

    const [, files] = await form.parse(req);

    if (!files.image) {
      res.status(400).json({
        success: false,
        message: "No image uploaded",
      });
      return;
    }

    const image = files.image;

    if (image) {
      const file = Array.isArray(image) ? image[0] : image;
      const fileBuffer = await fs.promises.readFile(file.filepath);

      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      
      const uploadResult = await s3Helper.uploadFile(fileBuffer, file.originalFilename || "untitled.jpeg", {
        folder: `attachments/${year}/${month}`,
        quality: 80,
        maxWidth: 900,
        maxHeight: 900,
      });

      const mediaData = {
        originalName: file.originalFilename || "untitled.jpeg",
        key: uploadResult.key,
        bucket: uploadResult.bucket,
        url: uploadResult.url,
        mimeType: uploadResult.mimeType,
        size: uploadResult.size || file.size,
      };

      const media = new MediaModel(mediaData);
      await media.save();
      await fs.promises.unlink(file.filepath);

      res.status(200).json({
        success: true,
        message: "Image uploaded successfully",
        data: uploadResult,
      });
      return;
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Upload media from editor error:", err);
    res.status(500).json({
      success: false,
      message: "Error uploading media",
      error: err.message,
    });
  }
};
