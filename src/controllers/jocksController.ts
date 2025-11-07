import { Request, Response } from "express";
import { JockModel } from "@/models/Jock";
import { Types } from "mongoose";
import slugify from "slugify";
import formidable from "formidable";
import fs from "fs";
import s3Helper from "@/utils/s3Helper";
import { MediaModel } from "@/models/Media";
import { firstValues } from "@/utils/formidableFirstValues";

// GET /api/jocks - Get all jocks with filtering and pagination
export const getAllJocks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = "1", limit = "10", search, station, sortBy = "name", sortOrder = "asc", isActive } = req.query;

    // Build filter object
    const filter: Record<string, unknown> = {};

    // Filter by active status
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (station !== undefined) {
      filter.station = station;
    }

    // Search functionality
    if (search && typeof search === "string") {
      filter.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }];
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

    // Get jocks with pagination
    const jocks = await JockModel.find(filter)
      .lean()
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate("image", "key bucket mimeType url")
      .populate("station", "name slug")
      .populate("programs", "name slug");

    // Get total count for pagination
    const total = await JockModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      message: "Jocks retrieved successfully",
      data: jocks,
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
    console.error("Get jocks error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving jocks",
      error: err.message,
    });
  }
};

// GET /api/jocks/:id - Get single jock by ID
export const getJockById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid jock ID format",
      });
      return;
    }

    const jock = await JockModel.findById(id)
      .lean()
      .populate("image", "key bucket mimeType url")
      .populate("station", "name slug")
      .populate("programs", "name slug description");

    if (!jock) {
      res.status(404).json({
        success: false,
        message: "Jock not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Jock retrieved successfully",
      data: jock,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get jock by ID error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving jock",
      error: err.message,
    });
  }
};

// GET /api/jocks/slug/:slug - Get single jock by slug
export const getJockBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const jock = await JockModel.findOne({
      slug: slug.toLowerCase(),
      isActive: true,
    })
      .lean()
      .populate("image", "key bucket mimeType url")
      .populate("station", "name slug")
      .populate("programs", "name slug description");

    if (!jock) {
      res.status(404).json({
        success: false,
        message: "Jock not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Jock retrieved successfully",
      data: jock,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get jock by slug error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving jock",
      error: err.message,
    });
  }
};

// POST /api/jocks - Create new jock
export const createJock = async (req: Request, res: Response): Promise<void> => {
  try {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ mimetype }) => {
        // Accept only image files
        return mimetype?.startsWith("image/") || false;
      },
    });

    const [fields, files] = await form.parse(req);

    const formData = firstValues(form, fields, ["programs"]);

    const { name, slug, bio, email, isActive = true, programs = [], station } = formData;

    const socialLinks = {
      facebook: formData.facebook || "",
      twitter: formData.twitter || "",
      instagram: formData.instagram || "",
      tiktok: formData.tiktok || "",
      youtube: formData.youtube || "",
    };

    // Validate required fields
    if (!name) {
      res.status(400).json({
        success: false,
        message: "Jock name is required",
      });
      return;
    }

    // Validate station ID if provided
    if (station && !Types.ObjectId.isValid(station)) {
      res.status(400).json({
        success: false,
        message: "Invalid station ID format",
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
    const existingJock = await JockModel.findOne({
      slug: finalSlug.toLowerCase(),
    });
    if (existingJock) {
      res.status(409).json({
        success: false,
        message: "Jock with this slug already exists",
      });
      return;
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
      return;
    }

    let imageId: Types.ObjectId | undefined;

    const image = files.image;
    if (image) {
      try {
        const file = Array.isArray(image) ? image[0] : image;
        const fileBuffer = await fs.promises.readFile(file.filepath);

        const uploadResult = await s3Helper.uploadFile(fileBuffer, file.originalFilename || "logo.jpg", {
          folder: "jocks",
          quality: 80,
          maxWidth: 400,
          maxHeight: 500,
        });

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
        imageId = media._id;

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

    // Validate program IDs if provided
    if (programs && Array.isArray(programs)) {
      for (const programId of programs) {
        if (!Types.ObjectId.isValid(programId)) {
          res.status(400).json({
            success: false,
            message: "Invalid program ID format",
          });
          return;
        }
      }
    }

    // Create new jock
    const jockData = {
      name: name.trim(),
      slug: finalSlug.toLowerCase().trim(),
      bio: bio?.trim(),
      email: email?.toLowerCase().trim(),
      image: imageId || undefined,
      station: station || undefined,
      socialLinks: socialLinks || undefined,
      isActive,
      programs: programs || [],
    };

    const jock = new JockModel(jockData);
    await jock.save();

    // Populate references before returning
    await jock.populate({
      path: "image",
      select: "key bucket mimeType url",
    });
    await jock.populate({
      path: "station",
      select: "name slug",
    });
    await jock.populate({
      path: "programs",
      select: "slug name",
    });

    res.status(201).json({
      success: true,
      message: "Jock created successfully",
      data: jock,
    });
  } catch (error: unknown) {
    console.log("error on create jock: ", error);
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
        message: "Jock with this slug already exists",
      });
      return;
    }

    console.error("Create jock error:", err);
    res.status(500).json({
      success: false,
      message: "Error creating jock",
      error: err.message,
    });
  }
};

//TODO: convert request to formData
// PUT /api/jocks/:id - Update jock by ID
export const updateJock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ mimetype }) => {
        // Accept only image files
        return mimetype?.startsWith("image/") || false;
      },
    });

    const [fields, files] = await form.parse(req);

    const updateData = firstValues(form, fields, ["programs"]);

        const { name, slug, bio, email, isActive = true, programs = [], station } = updateData;

        const socialLinks = {
          facebook: updateData.facebook || "",
          twitter: updateData.twitter || "",
          instagram: updateData.instagram || "",
          tiktok: updateData.tiktok || "",
          youtube: updateData.youtube || "",
        };

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid jock ID format",
      });
      return;
    }

    // Check if jock exists
    const existingJock = await JockModel.findById(id);
    if (!existingJock) {
      res.status(404).json({
        success: false,
        message: "Jock not found",
      });
      return;
    }

    // Check slug uniqueness if being updated
    if (slug && slug !== existingJock.slug) {
      const slugExists = await JockModel.findOne({
        slug: slug.toLowerCase(),
        _id: { $ne: id },
      });

      if (slugExists) {
        res.status(409).json({
          success: false,
          message: "Jock with this slug already exists",
        });
        return;
      }
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
      return;
    }

    // Validate station ID if provided
    if (station && !Types.ObjectId.isValid(station)) {
      res.status(400).json({
        success: false,
        message: "Invalid station ID format",
      });
      return;
    }

    let imageId: Types.ObjectId | undefined;

    const image = files.image;
    if (image) {
      //TODOS: Delete previous image from s3 and media collection if new image is uploaded
      try {
        const file = Array.isArray(image) ? image[0] : image;
        const fileBuffer = await fs.promises.readFile(file.filepath);

        const uploadResult = await s3Helper.uploadFile(fileBuffer, file.originalFilename || "logo.jpg", {
          folder: "jocks",
          quality: 80,
          maxWidth: 600,
          maxHeight: 600,
        });

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
        imageId = media._id;

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

    // Validate program IDs if provided
    if (programs && Array.isArray(programs)) {
      for (const programId of programs) {
        if (!Types.ObjectId.isValid(programId)) {
          res.status(400).json({
            success: false,
            message: "Invalid program ID format",
          });
          return;
        }
      }
    }

    // Prepare update data
    const sanitizedUpdateData: Record<string, unknown> = {};

    if (name !== undefined) sanitizedUpdateData.name = name?.trim();
    if (slug !== undefined) sanitizedUpdateData.slug = slug?.toLowerCase().trim();
    if (bio !== undefined) sanitizedUpdateData.bio = bio?.trim();
    if (email !== undefined) sanitizedUpdateData.email = email?.toLowerCase().trim();
    if (imageId) {
      sanitizedUpdateData.image = imageId;
    } else {
      sanitizedUpdateData.image = image;
    }
    if (station !== undefined) sanitizedUpdateData.station = station;
    if (socialLinks !== undefined) sanitizedUpdateData.socialLinks = socialLinks;
    if (isActive !== undefined) sanitizedUpdateData.isActive = isActive;
    if (programs !== undefined) sanitizedUpdateData.programs = programs;

    // Update jock
    const updatedJock = await JockModel.findByIdAndUpdate(id, sanitizedUpdateData, {
      new: true,
      runValidators: true,
    })
      .populate("image", "key bucket mimeType url")
      .populate("station", "name slug")
      .populate("programs", "slug name");

    res.json({
      success: true,
      message: "Jock updated successfully",
      data: updatedJock,
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
        message: "Jock with this slug already exists",
      });
      return;
    }

    console.error("Update jock error:", err);
    res.status(500).json({
      success: false,
      message: "Error updating jock",
      error: err.message,
    });
  }
};

// DELETE /api/jocks/:id - Delete jock by ID
export const deleteJock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid jock ID format",
      });
      return;
    }

    // Check if jock exists
    const existingJock = await JockModel.findById(id);
    if (!existingJock) {
      res.status(404).json({
        success: false,
        message: "Jock not found",
      });
      return;
    }

    // Delete the jock
    const deletedJock = await JockModel.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Jock deleted successfully",
      data: deletedJock,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Delete jock error:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting jock",
      error: err.message,
    });
  }
};

// PATCH /api/jocks/:id/toggle-status - Toggle jock active status
export const toggleJockStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid jock ID format",
      });
      return;
    }

    const jock = await JockModel.findById(id);

    if (!jock) {
      res.status(404).json({
        success: false,
        message: "Jock not found",
      });
      return;
    }

    // Toggle status
    const newStatus = !jock.isActive;

    const updatedJock = await JockModel.findByIdAndUpdate(id, { isActive: newStatus }, { new: true })
      .populate("image", "key bucket mimeType url")
      .populate("station", "name slug")
      .populate("programs", "slug name");

    res.json({
      success: true,
      message: `Jock ${newStatus ? "activated" : "deactivated"} successfully`,
      data: updatedJock,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Toggle jock status error:", err);
    res.status(500).json({
      success: false,
      message: "Error updating jock status",
      error: err.message,
    });
  }
};

// PATCH /api/jocks/:id/add-program - Add program to jock
export const addProgramToJock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { programId } = req.body;

    // Validate ObjectIds
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid jock ID format",
      });
      return;
    }

    if (!programId || !Types.ObjectId.isValid(programId)) {
      res.status(400).json({
        success: false,
        message: "Valid program ID is required",
      });
      return;
    }

    const jock = await JockModel.findById(id);

    if (!jock) {
      res.status(404).json({
        success: false,
        message: "Jock not found",
      });
      return;
    }

    const updatedJock = await jock.addProgram(programId);

    res.json({
      success: true,
      message: "Program added to jock successfully",
      data: updatedJock,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Add program to jock error:", err);
    res.status(500).json({
      success: false,
      message: "Error adding program to jock",
      error: err.message,
    });
  }
};

// PATCH /api/jocks/:id/remove-program - Remove program from jock
export const removeProgramFromJock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { programId } = req.body;

    // Validate ObjectIds
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid jock ID format",
      });
      return;
    }

    if (!programId || !Types.ObjectId.isValid(programId)) {
      res.status(400).json({
        success: false,
        message: "Valid program ID is required",
      });
      return;
    }

    const jock = await JockModel.findById(id);

    if (!jock) {
      res.status(404).json({
        success: false,
        message: "Jock not found",
      });
      return;
    }

    const updatedJock = await jock.removeProgram(programId);

    res.json({
      success: true,
      message: "Program removed from jock successfully",
      data: updatedJock,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Remove program from jock error:", err);
    res.status(500).json({
      success: false,
      message: "Error removing program from jock",
      error: err.message,
    });
  }
};

// GET /api/jocks/search - Search jocks
export const searchJocks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== "string") {
      res.status(400).json({
        success: false,
        message: "Search query is required",
      });
      return;
    }

    const jocks = await JockModel.searchJocks(query);

    res.json({
      success: true,
      message: "Jock search completed successfully",
      data: jocks,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Search jocks error:", err);
    res.status(500).json({
      success: false,
      message: "Error searching jocks",
      error: err.message,
    });
  }
};
