import { Request, Response } from "express";
import { HostModel } from "../models/Host";
import { Types } from "mongoose";

// GET /api/hosts - Get all hosts with filtering and pagination
export const getAllHosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      search,
      sortBy = "name",
      sortOrder = "asc",
      isActive,
      withPrograms,
    } = req.query;

    // Build filter object
    const filter: Record<string, unknown> = {};

    // Filter by active status
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    // Filter by hosts with programs
    if (withPrograms === "true") {
      filter.programs = { $exists: true, $not: { $size: 0 } };
    } else if (withPrograms === "false") {
      filter.programs = { $size: 0 };
    }

    // Search functionality
    if (search && typeof search === "string") {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { bio: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
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

    // Get hosts with pagination
    const hosts = await HostModel.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate("image", "filename url")
      .populate("programs", "title slug");

    // Get total count for pagination
    const total = await HostModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      message: "Hosts retrieved successfully",
      data: {
        hosts,
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
    console.error("Get hosts error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving hosts",
      error: err.message,
    });
  }
};

// GET /api/hosts/:id - Get single host by ID
export const getHostById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid host ID format",
      });
      return;
    }

    const host = await HostModel.findById(id)
      .populate("image", "filename url")
      .populate("programs", "title slug description");

    if (!host) {
      res.status(404).json({
        success: false,
        message: "Host not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Host retrieved successfully",
      data: { host },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get host by ID error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving host",
      error: err.message,
    });
  }
};

// GET /api/hosts/slug/:slug - Get single host by slug
export const getHostBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const host = await HostModel.findOne({ 
      slug: slug.toLowerCase(),
      isActive: true 
    })
      .populate("image", "filename url")
      .populate("programs", "title slug description");

    if (!host) {
      res.status(404).json({
        success: false,
        message: "Host not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Host retrieved successfully",
      data: { host },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get host by slug error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving host",
      error: err.message,
    });
  }
};

// POST /api/hosts - Create new host
export const createHost = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      slug,
      bio,
      email,
      image,
      socialLinks,
      isActive = true,
      programs = [],
    } = req.body;

    // Validate required fields
    if (!name) {
      res.status(400).json({
        success: false,
        message: "Host name is required",
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
    const existingHost = await HostModel.findOne({
      slug: finalSlug.toLowerCase(),
    });
    if (existingHost) {
      res.status(409).json({
        success: false,
        message: "Host with this slug already exists",
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

    // Validate image ID if provided
    if (image && !Types.ObjectId.isValid(image)) {
      res.status(400).json({
        success: false,
        message: "Invalid image ID format",
      });
      return;
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

    // Create new host
    const hostData = {
      name: name.trim(),
      slug: finalSlug.toLowerCase().trim(),
      bio: bio?.trim(),
      email: email?.toLowerCase().trim(),
      image: image || undefined,
      socialLinks: socialLinks || undefined,
      isActive,
      programs: programs || [],
    };

    const host = new HostModel(hostData);
    await host.save();

    // Populate references before returning
    await host.populate("image programs");

    res.status(201).json({
      success: true,
      message: "Host created successfully",
      data: { host },
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
        message: "Host with this slug already exists",
      });
      return;
    }

    console.error("Create host error:", err);
    res.status(500).json({
      success: false,
      message: "Error creating host",
      error: err.message,
    });
  }
};

// PUT /api/hosts/:id - Update host by ID
export const updateHost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid host ID format",
      });
      return;
    }

    // Check if host exists
    const existingHost = await HostModel.findById(id);
    if (!existingHost) {
      res.status(404).json({
        success: false,
        message: "Host not found",
      });
      return;
    }

    // Check slug uniqueness if being updated
    if (updateData.slug && updateData.slug !== existingHost.slug) {
      const slugExists = await HostModel.findOne({
        slug: updateData.slug.toLowerCase(),
        _id: { $ne: id },
      });

      if (slugExists) {
        res.status(409).json({
          success: false,
          message: "Host with this slug already exists",
        });
        return;
      }
    }

    // Validate email format if provided
    if (updateData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
      return;
    }

    // Validate image ID if provided
    if (updateData.image && !Types.ObjectId.isValid(updateData.image)) {
      res.status(400).json({
        success: false,
        message: "Invalid image ID format",
      });
      return;
    }

    // Validate program IDs if provided
    if (updateData.programs && Array.isArray(updateData.programs)) {
      for (const programId of updateData.programs) {
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

    if (updateData.name !== undefined) sanitizedUpdateData.name = updateData.name?.trim();
    if (updateData.slug !== undefined) sanitizedUpdateData.slug = updateData.slug?.toLowerCase().trim();
    if (updateData.bio !== undefined) sanitizedUpdateData.bio = updateData.bio?.trim();
    if (updateData.email !== undefined) sanitizedUpdateData.email = updateData.email?.toLowerCase().trim();
    if (updateData.image !== undefined) sanitizedUpdateData.image = updateData.image;
    if (updateData.socialLinks !== undefined) sanitizedUpdateData.socialLinks = updateData.socialLinks;
    if (updateData.isActive !== undefined) sanitizedUpdateData.isActive = updateData.isActive;
    if (updateData.programs !== undefined) sanitizedUpdateData.programs = updateData.programs;

    // Update host
    const updatedHost = await HostModel.findByIdAndUpdate(
      id,
      sanitizedUpdateData,
      {
        new: true,
        runValidators: true,
      }
    ).populate("image programs");

    res.json({
      success: true,
      message: "Host updated successfully",
      data: { host: updatedHost },
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
        message: "Host with this slug already exists",
      });
      return;
    }

    console.error("Update host error:", err);
    res.status(500).json({
      success: false,
      message: "Error updating host",
      error: err.message,
    });
  }
};

// DELETE /api/hosts/:id - Delete host by ID
export const deleteHost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid host ID format",
      });
      return;
    }

    // Check if host exists
    const existingHost = await HostModel.findById(id);
    if (!existingHost) {
      res.status(404).json({
        success: false,
        message: "Host not found",
      });
      return;
    }

    // Delete the host
    const deletedHost = await HostModel.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Host deleted successfully",
      data: { host: deletedHost },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Delete host error:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting host",
      error: err.message,
    });
  }
};

// PATCH /api/hosts/:id/toggle-status - Toggle host active status
export const toggleHostStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid host ID format",
      });
      return;
    }

    const host = await HostModel.findById(id);

    if (!host) {
      res.status(404).json({
        success: false,
        message: "Host not found",
      });
      return;
    }

    // Toggle status
    const newStatus = !host.isActive;

    const updatedHost = await HostModel.findByIdAndUpdate(
      id,
      { isActive: newStatus },
      { new: true }
    ).populate("image programs");

    res.json({
      success: true,
      message: `Host ${newStatus ? "activated" : "deactivated"} successfully`,
      data: { host: updatedHost },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Toggle host status error:", err);
    res.status(500).json({
      success: false,
      message: "Error updating host status",
      error: err.message,
    });
  }
};

// PATCH /api/hosts/:id/add-program - Add program to host
export const addProgramToHost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { programId } = req.body;

    // Validate ObjectIds
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid host ID format",
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

    const host = await HostModel.findById(id);

    if (!host) {
      res.status(404).json({
        success: false,
        message: "Host not found",
      });
      return;
    }

    const updatedHost = await host.addProgram(programId);

    res.json({
      success: true,
      message: "Program added to host successfully",
      data: { host: updatedHost },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Add program to host error:", err);
    res.status(500).json({
      success: false,
      message: "Error adding program to host",
      error: err.message,
    });
  }
};

// PATCH /api/hosts/:id/remove-program - Remove program from host
export const removeProgramFromHost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { programId } = req.body;

    // Validate ObjectIds
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid host ID format",
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

    const host = await HostModel.findById(id);

    if (!host) {
      res.status(404).json({
        success: false,
        message: "Host not found",
      });
      return;
    }

    const updatedHost = await host.removeProgram(programId);

    res.json({
      success: true,
      message: "Program removed from host successfully",
      data: { host: updatedHost },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Remove program from host error:", err);
    res.status(500).json({
      success: false,
      message: "Error removing program from host",
      error: err.message,
    });
  }
};

// GET /api/hosts/search - Search hosts
export const searchHosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== "string") {
      res.status(400).json({
        success: false,
        message: "Search query is required",
      });
      return;
    }

    const hosts = await HostModel.searchHosts(query);

    res.json({
      success: true,
      message: "Host search completed successfully",
      data: { hosts },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Search hosts error:", err);
    res.status(500).json({
      success: false,
      message: "Error searching hosts",
      error: err.message,
    });
  }
};
