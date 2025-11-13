import { Request, Response } from "express";
import { StationModel } from "@/models/Station";
import { MediaModel } from "@/models/Media";
import { s3Helper } from "@/utils/s3Helper";
import { Types } from "mongoose";
import formidable from "formidable";
import fs from "fs";
import { firstValues } from "@/utils/formidableFirstValues";

// GET /api/stations - Get all stations
export const getAllStations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, locationGroup, page = "1", limit = "10", search } = req.query;

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
      .limit(limitNum)
      .populate("logoImage", "key bucket url mimeType");

    // Get total count for pagination
    const total = await StationModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      message: "Stations retrieved successfully",
      data: stations,
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
    console.error("Get stations error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving stations",
      error: err.message,
    });
  }
};

// GET /api/stations/:id - Get single station by ID
export const getStationById = async (req: Request, res: Response): Promise<void> => {
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

    const station = await StationModel.findById(id).populate("logoImage", "key bucket url mimeType");

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
      data: station,
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
export const getStationBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const station = await StationModel.findOne({
      slug: slug.toLowerCase(),
    }).populate("logoImage");

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
      data: station,
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
export const createStation = async (req: Request, res: Response): Promise<void> => {
  //TODOS: Still uploads in S3 even if failed in validation
  try {
    // Parse form data with formidable
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ mimetype }) => {
        // Accept only image files
        return mimetype?.startsWith("image/") || false;
      },
    });

    const [fields, files] = await form.parse(req);

    // Extract form fields using firstValues helper
    const formData = firstValues(form, fields);
    const {
      name,
      slug,
      frequency,
      address,
      locationGroup,
      contactNumber,
      email,
      mapEmbedCode,
      audioStreamURL,
      videoStreamURL,
      status = "active",
    } = formData;

    const socialLinks = {
      facebook: formData.facebook || "",
      twitter: formData.twitter || "",
      instagram: formData.instagram || "",
      tiktok: formData.tiktok || "",
      youtube: formData.youtube || "",
    };

    // Validate required fields
    if (!name || !locationGroup) {
      res.status(400).json({
        success: false,
        message: "Name and location group are required",
      });
      return;
    }

    // Check if station with slug already exists
    const existingStation = await StationModel.findOne({
      slug: slug?.toLowerCase(),
    });
    if (existingStation) {
      res.status(409).json({
        success: false,
        message: "Station with this slug already exists",
      });
      return;
    }

    let logoImageId: Types.ObjectId | undefined;

    // Handle logo image upload if provided
    const logoImageFile = files.logoImage;
    if (logoImageFile) {
      try {
        const file = Array.isArray(logoImageFile) ? logoImageFile[0] : logoImageFile;

        // Read file buffer
        const fileBuffer = await fs.promises.readFile(file.filepath);

        //Validate if file is image
        const mimeType = file.mimetype || "";
        if (!mimeType.startsWith("image/")) {
          res.status(400).json({
            success: false,
            message: "Uploaded image is not a valid image type.",
          });
          return;
        }
        // Upload to S3 and compress
        const uploadResult = await s3Helper.uploadFile(fileBuffer, file.originalFilename || "logo.jpg", {
          folder: "stations/logos",
          quality: 80,
          maxWidth: 600,
          maxHeight: 600,
        });

        // Create Media document
        const mediaData = {
          originalName: file.originalFilename || "logo.jpg",
          key: uploadResult.key,
          bucket: uploadResult.bucket,
          url: uploadResult.url,
          mimeType: uploadResult.mimeType,
          size: uploadResult.size || file.size,
        };

        const media = new MediaModel(mediaData);
        await media.save();
        logoImageId = media._id;

        // Clean up temporary file
        await fs.promises.unlink(file.filepath);
      } catch (uploadError) {
        console.error("Logo upload error:", uploadError);
        res.status(500).json({
          success: false,
          message: "Failed to upload logo image",
          error: uploadError instanceof Error ? uploadError.message : "Unknown error",
        });
        return;
      }
    }

    // Create new station
    const stationData = {
      name: name?.trim(),
      slug: slug?.toLowerCase().trim(),
      frequency: frequency?.trim(),
      address: address?.trim(),
      locationGroup: locationGroup as "luzon" | "visayas" | "mindanao",
      logoImage: logoImageId,
      contactNumber: contactNumber?.trim(),
      email: email?.trim().toLowerCase(),
      mapEmbedCode: mapEmbedCode?.trim(),
      audioStreamURL: audioStreamURL?.trim(),
      videoStreamURL: videoStreamURL?.trim(),
      socialLinks: socialLinks || undefined,
      status: status as "active" | "inactive",
    };

    const station = new StationModel(stationData);
    await station.save();

    // Populate the logo image for response
    await station.populate("logoImage");

    res.status(201).json({
      success: true,
      message: "Station created successfully",
      data: station,
    });
  } catch (error: unknown) {
    console.log("Create station error caught:", error);
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
export const updateStation = async (req: Request, res: Response): Promise<void> => {
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

    // Check if station exists
    const existingStation = await StationModel.findById(id);
    if (!existingStation) {
      res.status(404).json({
        success: false,
        message: "Station not found",
      });
      return;
    }

    // Parse form data with formidable
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ mimetype }) => {
        // Accept only image files
        return mimetype?.startsWith("image/") || false;
      },
    });

    const [fields, files] = await form.parse(req);

    // Extract form fields using firstValues helper
    const formData = firstValues(form, fields);
    const {
      name,
      slug,
      frequency,
      address,
      locationGroup,
      contactNumber,
      email,
      mapEmbedCode,
      audioStreamURL,
      videoStreamURL,
      status,
    } = formData;

    const socialLinks = {
      facebook: formData.facebook || "",
      twitter: formData.twitter || "",
      instagram: formData.instagram || "",
      tiktok: formData.tiktok || "",
      youtube: formData.youtube || "",
    };

    // If slug is being updated, check for uniqueness
    if (slug && slug !== existingStation.slug) {
      const slugExists = await StationModel.findOne({
        slug: slug.toLowerCase(),
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

    let logoImageId: Types.ObjectId | undefined = existingStation.logoImage;
    let oldMediaToDelete: { _id: Types.ObjectId; key: string; bucket: string } | null = null;

    // Handle logo image upload if provided
    const logoImageFile = files.logoImage;
    if (logoImageFile) {
      try {
        const file = Array.isArray(logoImageFile) ? logoImageFile[0] : logoImageFile;

        // Read file buffer
        const fileBuffer = await fs.promises.readFile(file.filepath);

        //Validate if file is image
        const mimeType = file.mimetype || "";
        if (!mimeType.startsWith("image/")) {
          res.status(400).json({
            success: false,
            message: "Uploaded image is not a valid image type.",
          });
          return;
        }

        // Upload new logo to S3 and compress
        const uploadResult = await s3Helper.uploadFile(fileBuffer, file.originalFilename || "logo.jpg", {
          folder: "stations/logos",
          quality: 80,
          maxWidth: 600,
          maxHeight: 600,
        });

        // Create new Media document
        const mediaData = {
          originalName: file.originalFilename || "logo.jpg",
          key: uploadResult.key,
          bucket: uploadResult.bucket,
          url: uploadResult.url,
          mimeType: uploadResult.mimeType,
          size: uploadResult.size || file.size,
        };

        const media = new MediaModel(mediaData);
        await media.save();

        // If there was an existing logo, mark it for deletion
        if (existingStation.logoImage) {
          oldMediaToDelete = await MediaModel.findById(existingStation.logoImage);
        }

        logoImageId = media._id;

        // Clean up temporary file
        await fs.promises.unlink(file.filepath);
      } catch (uploadError) {
        console.error("Logo upload error:", uploadError);
        res.status(500).json({
          success: false,
          message: "Failed to upload logo image",
          error: uploadError instanceof Error ? uploadError.message : "Unknown error",
        });
        return;
      }
    }

    // Prepare update data
    const sanitizedUpdateData: Record<string, unknown> = {};

    if (name !== undefined) sanitizedUpdateData.name = name?.trim();
    if (slug !== undefined) sanitizedUpdateData.slug = slug?.toLowerCase().trim();
    if (frequency !== undefined) sanitizedUpdateData.frequency = frequency?.trim();
    if (address !== undefined) sanitizedUpdateData.address = address?.trim();
    if (locationGroup !== undefined)
      sanitizedUpdateData.locationGroup = locationGroup as "luzon" | "visayas" | "mindanao";
    if (contactNumber !== undefined) sanitizedUpdateData.contactNumber = contactNumber?.trim();
    if (email !== undefined) sanitizedUpdateData.email = email?.trim().toLowerCase();
    if (mapEmbedCode !== undefined) sanitizedUpdateData.mapEmbedCode = mapEmbedCode?.trim();
    if (audioStreamURL !== undefined) sanitizedUpdateData.audioStreamURL = audioStreamURL?.trim();
    if (videoStreamURL !== undefined) sanitizedUpdateData.videoStreamURL = videoStreamURL?.trim();
    if (status !== undefined) sanitizedUpdateData.status = status as "active" | "inactive";
    if (logoImageId !== undefined) sanitizedUpdateData.logoImage = logoImageId;
    if (socialLinks !== undefined) sanitizedUpdateData.socialLinks = socialLinks;

    // Update station
    const updatedStation = await StationModel.findByIdAndUpdate(id, sanitizedUpdateData, {
      new: true,
      runValidators: true,
    });

    // Delete old logo image from S3 and database if a new one was uploaded
    if (oldMediaToDelete) {
      try {
        await s3Helper.deleteFile(oldMediaToDelete.key, oldMediaToDelete.bucket);

        await MediaModel.findByIdAndDelete(oldMediaToDelete._id);
      } catch (deleteError) {
        console.error("Error deleting old logo image:", deleteError);
        // Don't fail the update if old file deletion fails
      }
    }

    // Populate the logo image for response
    await updatedStation?.populate("logoImage");

    res.json({
      success: true,
      message: "Station updated successfully",
      data: updatedStation,
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
export const deleteStation = async (req: Request, res: Response): Promise<void> => {
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

    // Delete logoImage in S3 if it exists
    if (deletedStation.logoImage) {
      try {
        // Find the media document to get the S3 key
        const media = await MediaModel.findById(deletedStation.logoImage);
        if (media) {
          // Delete from S3
          await s3Helper.deleteFile(media.key, media.bucket);
          console.log(`✅ Deleted S3 object: ${media.key}`);

          // Delete media document from database
          await MediaModel.findByIdAndDelete(deletedStation.logoImage);
          console.log(`✅ Deleted media document: ${deletedStation.logoImage}`);
        }
      } catch (deleteError) {
        console.error("Error deleting logo image:", deleteError);
      }
    }

    res.json({
      success: true,
      message: "Station deleted successfully",
      data: deletedStation,
    });
    return;
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
export const toggleStationStatus = async (req: Request, res: Response): Promise<void> => {
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

    const updatedStation = await StationModel.findByIdAndUpdate(id, { status: newStatus }, { new: true });

    res.json({
      success: true,
      message: `Station ${newStatus === "active" ? "activated" : "deactivated"} successfully`,
      data: updatedStation,
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

export const getDefaultStation = async (req: Request, res: Response): Promise<void> => {
  try {
    const defaultStation = await StationModel.getDefaultStation();

    if (!defaultStation) {
      res.status(404).json({
        success: false,
        message: "Default station not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Default station retrieved successfully",
      data: defaultStation,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get default station error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving default station",
      error: err.message,
    });
  }
};

export const setDefaultStation = async (req: Request, res: Response): Promise<void> => {
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

    const station = await StationModel.setDefaultStation(id);

    if (!station) {
      res.status(404).json({
        success: false,
        message: "Default station not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Station set as default successfully",
      data: station,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("set default station error:", err);
    res.status(500).json({
      success: false,
      message: "Error setting default station",
      error: err.message,
    });
  }
};
