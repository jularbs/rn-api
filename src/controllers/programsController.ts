import { Request, Response } from "express";
import { ProgramModel } from "@/models/Program";
import { StationModel } from "@/models/Station";
import { Types } from "mongoose";
import slugify from "slugify";
import formidable from "formidable";
import fs from "fs";
import s3Helper from "@/utils/s3Helper";
import { MediaModel } from "@/models/Media";
import { firstValues } from "@/utils/formidableFirstValues";
import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(alphabet, 8);

// GET /api/programs - Get all programs with filtering and pagination
export const getAllPrograms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = "1", limit = "10", search, sortBy = "name", sortOrder = "asc", isActive, station, day } = req.query;

    // Build filter object
    const filter: Record<string, unknown> = {};

    // Filter by active status
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    // Filter by station
    if (station && typeof station === "string" && Types.ObjectId.isValid(station)) {
      filter.station = station;
    }

    // Filter by day
    if (day !== undefined) {
      const dayNum = parseInt(day as string, 10);
      if (!isNaN(dayNum) && dayNum >= 0 && dayNum <= 6) {
        filter.day = dayNum;
      }
    }

    // Search functionality
    if (search && typeof search === "string") {
      filter.$or = [{ name: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }];
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

    // Get programs with pagination
    const programs = await ProgramModel.find(filter)
      .lean()
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate("image", "key bucket mimeType url")
      .populate("station", "name slug");

    // Get total count for pagination
    const total = await ProgramModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      message: "Programs retrieved successfully",
      data: programs,
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
    console.error("Get programs error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving programs",
      error: err.message,
    });
  }
};

// GET /api/programs/:id - Get single program by ID
export const getProgramById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid program ID format",
      });
      return;
    }

    const program = await ProgramModel.findById(id)
      .lean()
      .populate("image", "key bucket mimeType url")
      .populate("station", "name slug streamUrl");

    if (!program) {
      res.status(404).json({
        success: false,
        message: "Program not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Program retrieved successfully",
      data: program,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get program by ID error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving program",
      error: err.message,
    });
  }
};

// GET /api/programs/slug/:slug - Get single program by slug
export const getProgramBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const program = await ProgramModel.findOne({
      slug: slug.toLowerCase(),
      isActive: true,
    })
      .lean()
      .populate("image", "key bucket mimeType url")
      .populate("station", "name slug streamUrl");

    if (!program) {
      res.status(404).json({
        success: false,
        message: "Program not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Program retrieved successfully",
      data: program,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get program by slug error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving program",
      error: err.message,
    });
  }
};

// POST /api/programs - Create new program
export const createProgram = async (req: Request, res: Response): Promise<void> => {
  try {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ mimetype }) => {
        // Accept only image files
        return mimetype?.startsWith("image/") || false;
      },
    });

    const [fields, files] = await form.parse(req);

    const formData = firstValues(form, fields, ["day"]);

    const { name, slug, description, day, startTime, endTime, duration, station, isActive = true } = formData;

    // Validate required fields
    if (!name || !startTime || !endTime || !station) {
      res.status(400).json({
        success: false,
        message: "Name, startTime, endTime, and station are required",
      });
      return;
    }

    // Validate station ID
    if (!Types.ObjectId.isValid(station)) {
      res.status(400).json({
        success: false,
        message: "Invalid station ID format",
      });
      return;
    }

    // Check if station exists
    const stationExists = await StationModel.findById(station);
    if (!stationExists) {
      res.status(404).json({
        success: false,
        message: "Station not found",
      });
      return;
    }

    // Validate day array
    if (!day || !Array.isArray(day) || day.length === 0) {
      res.status(400).json({
        success: false,
        message: "Day array is required and must contain at least one day (0-6)",
      });
      return;
    }

    // Validate day values
    const dayNumbers = day.map((d) => parseInt(d, 10));
    if (dayNumbers.some((d) => isNaN(d) || d < 0 || d > 6)) {
      res.status(400).json({
        success: false,
        message: "Day values must be between 0-6 (Sunday=0, Monday=1, ..., Saturday=6)",
      });
      return;
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      res.status(400).json({
        success: false,
        message: "Times must be in HH:MM:SS format (24-hour)",
      });
      return;
    }

    // Generate slug if not provided
    let finalSlug = slug;
    if (!finalSlug) {
      finalSlug = slugify(`${name}-${stationExists.slug}-${nanoid()}`, {
        lower: true,
        strict: true,
        remove: /[*+~.()'"!:@]/g,
      });
    }

    // Check if slug already exists
    const existingProgram = await ProgramModel.findOne({
      slug: finalSlug.toLowerCase(),
    });
    if (existingProgram) {
      res.status(409).json({
        success: false,
        message: "Program with this slug already exists",
      });
      return;
    }

    //Check if there is conflicting schedule with the same station
    const conflictingProgram = await ProgramModel.findOne({
      station,
      day: { $in: dayNumbers },
      $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
    });

    if (conflictingProgram) {
      res.status(409).json({
        success: false,
        message: "Conflicting program schedule with " + conflictingProgram.name,
      });
      return;
    }

    let imageId: Types.ObjectId | undefined;

    const image = files.image;
    if (image) {
      try {
        const file = Array.isArray(image) ? image[0] : image;
        const fileBuffer = await fs.promises.readFile(file.filepath);

        const uploadResult = await s3Helper.uploadFile(fileBuffer, file.originalFilename || "program.jpg", {
          folder: "programs",
          quality: 80,
          maxWidth: 800,
          maxHeight: 800,
        });

        const mediaData = {
          originalName: file.originalFilename || "program.jpg",
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
        console.error("Image upload error:", uploadError);
        res.status(500).json({
          success: false,
          message: "Failed to upload program image",
          error: uploadError instanceof Error ? uploadError.message : "Unknown error",
        });
        return;
      }
    }

    // Create new program
    const programData = {
      name: name.trim(),
      slug: finalSlug.toLowerCase().trim(),
      description: description?.trim(),
      day: dayNumbers,
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      duration: duration ? parseInt(duration, 10) : undefined,
      station,
      image: imageId || undefined,
      isActive,
    };

    const program = new ProgramModel(programData);
    await program.save();

    // Populate references before returning
    await program.populate({
      path: "image",
      select: "key bucket mimeType url",
    });
    await program.populate({
      path: "station",
      select: "name slug",
    });

    res.status(201).json({
      success: true,
      message: "Program created successfully",
      data: program,
    });
  } catch (error: unknown) {
    console.log("error on create program: ", error);
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
        message: "Program with this slug already exists",
      });
      return;
    }

    console.error("Create program error:", err);
    res.status(500).json({
      success: false,
      message: "Error creating program",
      error: err.message,
    });
  }
};

// PUT /api/programs/:id - Update program by ID
export const updateProgram = async (req: Request, res: Response): Promise<void> => {
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

    const updateData = firstValues(form, fields, ["day"]);

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid program ID format",
      });
      return;
    }

    // Check if program exists
    const existingProgram = await ProgramModel.findById(id);
    if (!existingProgram) {
      res.status(404).json({
        success: false,
        message: "Program not found",
      });
      return;
    }

    // Check slug uniqueness if being updated
    if (updateData.slug && updateData.slug !== existingProgram.slug) {
      const slugExists = await ProgramModel.findOne({
        slug: updateData.slug.toLowerCase(),
        _id: { $ne: id },
      });

      if (slugExists) {
        res.status(409).json({
          success: false,
          message: "Program with this slug already exists",
        });
        return;
      }
    }

    // Validate station if being updated
    if (updateData.station) {
      if (!Types.ObjectId.isValid(updateData.station)) {
        res.status(400).json({
          success: false,
          message: "Invalid station ID format",
        });
        return;
      }

      const stationExists = await StationModel.findById(updateData.station);
      if (!stationExists) {
        res.status(404).json({
          success: false,
          message: "Station not found",
        });
        return;
      }
    }

    // Validate day array if being updated
    const dayNumbers = updateData.day.map((d: string) => parseInt(d, 10));
    if (dayNumbers) {
      if (!Array.isArray(dayNumbers) || dayNumbers.length === 0) {
        res.status(400).json({
          success: false,
          message: "Day array must contain at least one day (0-6)",
        });
        return;
      }

      if (dayNumbers.some((d: number) => isNaN(d) || d < 0 || d > 6)) {
        res.status(400).json({
          success: false,
          message: "Day values must be between 0-6 (Sunday=0, Monday=1, ..., Saturday=6)",
        });
        return;
      }
      updateData.day = dayNumbers;
    }

    // Validate time format if being updated
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    if (updateData.startTime && !timeRegex.test(updateData.startTime)) {
      res.status(400).json({
        success: false,
        message: "Start time must be in HH:MM:SS format (24-hour)",
      });
      return;
    }

    if (updateData.endTime && !timeRegex.test(updateData.endTime)) {
      res.status(400).json({
        success: false,
        message: "End time must be in HH:MM:SS format (24-hour)",
      });
      return;
    }

    //Check if there is conflicting schedule with the same station
    const conflictingProgram = await ProgramModel.findOne({
      _id: { $ne: id },
      station: updateData.station,
      day: { $in: dayNumbers },
      $or: [{ startTime: { $lt: updateData.endTime }, endTime: { $gt: updateData.startTime } }],
    });

    if (conflictingProgram) {
      res.status(409).json({
        success: false,
        message: "Conflicting program schedule with " + conflictingProgram.name,
      });
      return;
    }

    let imageId: Types.ObjectId | undefined;

    const image = files.image;
    if (image) {
      try {
        const file = Array.isArray(image) ? image[0] : image;
        const fileBuffer = await fs.promises.readFile(file.filepath);

        const uploadResult = await s3Helper.uploadFile(fileBuffer, file.originalFilename || "program.jpg", {
          folder: "programs",
          quality: 80,
          maxWidth: 800,
          maxHeight: 800,
        });

        const mediaData = {
          originalName: file.originalFilename || "program.jpg",
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
        console.error("Image upload error:", uploadError);
        res.status(500).json({
          success: false,
          message: "Failed to upload program image",
          error: uploadError instanceof Error ? uploadError.message : "Unknown error",
        });
        return;
      }
    }

    // Prepare update data
    const sanitizedUpdateData: Record<string, unknown> = {};

    if (updateData.name !== undefined) sanitizedUpdateData.name = updateData.name?.trim();
    if (updateData.slug !== undefined) sanitizedUpdateData.slug = updateData.slug?.toLowerCase().trim();
    if (updateData.description !== undefined) sanitizedUpdateData.description = updateData.description?.trim();
    if (updateData.day !== undefined) sanitizedUpdateData.day = updateData.day;
    if (updateData.startTime !== undefined) sanitizedUpdateData.startTime = updateData.startTime?.trim();
    if (updateData.endTime !== undefined) sanitizedUpdateData.endTime = updateData.endTime?.trim();
    if (updateData.duration !== undefined) sanitizedUpdateData.duration = parseInt(updateData.duration as string, 10);
    if (updateData.station !== undefined) sanitizedUpdateData.station = updateData.station;
    if (imageId) {
      sanitizedUpdateData.image = imageId;
    } else if (updateData.image !== undefined) {
      sanitizedUpdateData.image = updateData.image;
    }
    if (updateData.isActive !== undefined) sanitizedUpdateData.isActive = updateData.isActive;

    // Update program
    const updatedProgram = await ProgramModel.findByIdAndUpdate(id, sanitizedUpdateData, {
      new: true,
      runValidators: true,
    })
      .populate("image", "key bucket mimeType url")
      .populate("station", "name slug");

    res.json({
      success: true,
      message: "Program updated successfully",
      data: updatedProgram,
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
        message: "Program with this slug already exists",
      });
      return;
    }

    console.error("Update program error:", err);
    res.status(500).json({
      success: false,
      message: "Error updating program",
      error: err.message,
    });
  }
};

// DELETE /api/programs/:id - Delete program by ID
export const deleteProgram = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid program ID format",
      });
      return;
    }

    // Check if program exists
    const existingProgram = await ProgramModel.findById(id);
    if (!existingProgram) {
      res.status(404).json({
        success: false,
        message: "Program not found",
      });
      return;
    }

    // Delete the program
    const deletedProgram = await ProgramModel.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Program deleted successfully",
      data: deletedProgram,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Delete program error:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting program",
      error: err.message,
    });
  }
};

// PATCH /api/programs/:id/toggle-status - Toggle program active status
export const toggleProgramStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid program ID format",
      });
      return;
    }

    const program = await ProgramModel.findById(id);

    if (!program) {
      res.status(404).json({
        success: false,
        message: "Program not found",
      });
      return;
    }

    // Toggle status
    const newStatus = !program.isActive;

    const updatedProgram = await ProgramModel.findByIdAndUpdate(id, { isActive: newStatus }, { new: true })
      .populate("image", "key bucket mimeType url")
      .populate("station", "name slug");

    res.json({
      success: true,
      message: `Program ${newStatus ? "activated" : "deactivated"} successfully`,
      data: updatedProgram,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Toggle program status error:", err);
    res.status(500).json({
      success: false,
      message: "Error updating program status",
      error: err.message,
    });
  }
};

// GET /api/programs/schedule/day/:day - Get programs by day
export const getProgramsByDay = async (req: Request, res: Response): Promise<void> => {
  try {
    const { day } = req.params;
    const { station } = req.query;

    // Parse day (can be number 0-6 or day name)
    let dayNumber: number;

    if (!isNaN(parseInt(day, 10))) {
      dayNumber = parseInt(day, 10);
      if (dayNumber < 0 || dayNumber > 6) {
        res.status(400).json({
          success: false,
          message: "Day number must be between 0-6 (Sunday=0, Saturday=6)",
        });
        return;
      }
    } else {
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      dayNumber = dayNames.indexOf(day.toLowerCase());
      if (dayNumber === -1) {
        res.status(400).json({
          success: false,
          message: "Invalid day name. Use sunday, monday, tuesday, wednesday, thursday, friday, or saturday",
        });
        return;
      }
    }

    const filter: Record<string, unknown> = {
      day: dayNumber,
      isActive: true,
    };

    if (station && typeof station === "string" && Types.ObjectId.isValid(station)) {
      filter.station = station;
    }

    const programs = await ProgramModel.find(filter)
      .sort({ startTime: 1 })
      .populate("image", "key bucket mimeType url")
      .populate("station", "name slug");

    res.json({
      success: true,
      message: "Programs retrieved successfully",
      data: programs,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get programs by day error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving programs",
      error: err.message,
    });
  }
};

// GET /api/programs/schedule/now - Get currently airing programs
export const getCurrentlyAiringPrograms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { station } = req.query;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const filter: Record<string, unknown> = {
      day: currentDay,
      isActive: true,
    };

    if (station && typeof station === "string" && Types.ObjectId.isValid(station)) {
      filter.station = station;
    }

    const programs = await ProgramModel.find(filter)
      .populate("image", "key bucket mimeType url")
      .populate("station", "name slug");

    // Filter programs that are currently on air
    const parseTime = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const currentMinutes = parseTime(currentTime);

    const airingPrograms = programs.filter((program) => {
      const startMinutes = parseTime(program.startTime);
      const endMinutes = parseTime(program.endTime);

      if (startMinutes <= endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      } else {
        // Overnight program
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }
    });

    res.json({
      success: true,
      message: "Currently airing programs retrieved successfully",
      data: airingPrograms,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get currently airing programs error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving currently airing programs",
      error: err.message,
    });
  }
};

// GET /api/programs/schedule/station/:stationId - Get programs by station
export const getProgramsByStation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stationId } = req.params;

    if (!Types.ObjectId.isValid(stationId)) {
      res.status(400).json({
        success: false,
        message: "Invalid station ID format",
      });
      return;
    }

    const programs = await ProgramModel.find({
      station: stationId,
      isActive: true,
    })
      .sort({ day: 1, startTime: 1 })
      .populate("image", "key bucket mimeType url")
      .populate("station", "name slug");

    res.json({
      success: true,
      message: "Programs retrieved successfully",
      data: programs,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get programs by station error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving programs",
      error: err.message,
    });
  }
};

// GET /api/programs/schedule/weekly - Get weekly schedule
export const getWeeklySchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { station } = req.query;

    const filter: Record<string, unknown> = { isActive: true };

    if (station && typeof station === "string" && Types.ObjectId.isValid(station)) {
      filter.station = station;
    }

    const programs = await ProgramModel.find(filter)
      .sort({ day: 1, startTime: 1 })
      .populate("image", "key bucket mimeType url")
      .populate("station", "name slug");

    // Group programs by day
    const schedule: Record<number, unknown[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };

    programs.forEach((program) => {
      program.day.forEach((dayNum) => {
        if (schedule[dayNum]) {
          schedule[dayNum].push(program);
        }
      });
    });

    res.json({
      success: true,
      message: "Weekly schedule retrieved successfully",
      data: schedule,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get weekly schedule error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving weekly schedule",
      error: err.message,
    });
  }
};

// GET /api/programs/search - Search programs
export const searchPrograms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== "string") {
      res.status(400).json({
        success: false,
        message: "Search query is required",
      });
      return;
    }

    const programs = await ProgramModel.find({
      $or: [{ name: { $regex: query, $options: "i" } }, { description: { $regex: query, $options: "i" } }],
      isActive: true,
    })
      .populate("image", "key bucket mimeType url")
      .populate("station", "name slug");

    res.json({
      success: true,
      message: "Program search completed successfully",
      data: programs,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Search programs error:", err);
    res.status(500).json({
      success: false,
      message: "Error searching programs",
      error: err.message,
    });
  }
};

// GET /api/programs/conflicts - Find time conflicts
export const findProgramConflicts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { station } = req.query;

    let stationId: string | Types.ObjectId | undefined;

    if (station && typeof station === "string" && Types.ObjectId.isValid(station)) {
      stationId = station;
    }

    const conflicts = await ProgramModel.findTimeConflicts(stationId);

    res.json({
      success: true,
      message: "Program conflicts retrieved successfully",
      data: conflicts,
      count: conflicts.length,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Find program conflicts error:", err);
    res.status(500).json({
      success: false,
      message: "Error finding program conflicts",
      error: err.message,
    });
  }
};
