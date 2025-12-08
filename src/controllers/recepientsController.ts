import { Request, Response } from "express";
import { RecepientModel } from "@/models/Recepient";
import { Types } from "mongoose";

// POST /api/recepients - Create new recepient
export const createRecepient = async (req: Request, res: Response): Promise<void> => {
  try {
    const recepientData = req.body;

    // Create new recepient
    const recepient = new RecepientModel(recepientData);
    await recepient.save();

    res.status(201).json({
      success: true,
      message: "Recepient created successfully",
      data: recepient,
    });
  } catch (error: unknown) {
    const err = error as Error & { name?: string; code?: number; errors?: Record<string, { message: string }> };

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
      res.status(400).json({
        success: false,
        message: "Recepient with this reason already exists",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Error creating recepient",
      error: err.message,
    });
  }
};

// GET /api/recepients/:id - Get recepient by ID
export const getRecepientById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid recepient ID format",
      });
      return;
    }

    const recepient = await RecepientModel.findById(id);

    if (!recepient) {
      res.status(404).json({
        success: false,
        message: "Recepient not found",
      });
      return;
    }

    res.json({
      success: true,
      data: recepient,
    });
  } catch (error: unknown) {
    const err = error as Error;

    res.status(500).json({
      success: false,
      message: "Error fetching recepient",
      error: err.message,
    });
  }
};

// GET /api/recepients - Get all recepients with pagination and filtering
export const getAllRecepients = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, isActive, search, sortBy = "createdAt", sortOrder = "desc" } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    // Build query
    const query: Record<string, unknown> = {};

    if (req.user) {
      if (isActive !== undefined) query.isActive = isActive === "true";
    } else {
      query.isActive = true;
    }

    if (search) {
      query.$or = [
        { reason: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Sort configuration
    const sortConfig: Record<string, 1 | -1> = {};
    sortConfig[sortBy as string] = sortOrder === "desc" ? -1 : 1;

    // Execute query with pagination
    const [recepients, total] = await Promise.all([
      RecepientModel.find()
        .where(query)
        .sort(sortConfig)
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber),
      RecepientModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limitNumber);

    res.json({
      success: true,
      data: recepients,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      message: "Error fetching recepients",
      error: err.message,
    });
  }
};

// PUT /api/recepients/:id - Update recepient by ID
export const updateRecepient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid recepient ID format",
      });
      return;
    }

    const recepient = await RecepientModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

    if (!recepient) {
      res.status(404).json({
        success: false,
        message: "Recepient not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Recepient updated successfully",
      data: recepient,
    });
  } catch (error: unknown) {
    const err = error as Error & { name?: string; code?: number; errors?: Record<string, { message: string }> };

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
      res.status(400).json({
        success: false,
        message: "Recepient with this reason already exists",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Error updating recepient",
      error: err.message,
    });
  }
};

// PUT /api/recepients/:id/toggle-status - Toggle recepient active status
export const toggleRecepientStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid recepient ID format",
      });
      return;
    }

    const recepient = await RecepientModel.findById(id);

    if (!recepient) {
      res.status(404).json({
        success: false,
        message: "Recepient not found",
      });
      return;
    }

    recepient.isActive = !recepient.isActive;
    await recepient.save();

    res.json({
      success: true,
      message: `Recepient ${recepient.isActive ? "activated" : "deactivated"} successfully`,
      data: recepient,
    });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      message: "Error toggling recepient status",
      error: err.message,
    });
  }
};

// DELETE /api/recepients/:id - Soft delete recepient by ID
export const deleteRecepient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid recepient ID format",
      });
      return;
    }

    const recepient = await RecepientModel.findById(id);

    if (!recepient) {
      res.status(404).json({
        success: false,
        message: "Recepient not found",
      });
      return;
    }

    await recepient.softDelete(userId);

    res.json({
      success: true,
      message: "Recepient deleted successfully",
    });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      message: "Error deleting recepient",
      error: err.message,
    });
  }
};

// PUT /api/recepients/:id/restore - Restore soft deleted recepient
export const restoreRecepient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid recepient ID format",
      });
      return;
    }

    const recepient = await RecepientModel.findById(id).setOptions({ includeDeleted: true });

    if (!recepient) {
      res.status(404).json({
        success: false,
        message: "Recepient not found",
      });
      return;
    }

    if (!recepient.isDeleted()) {
      res.status(400).json({
        success: false,
        message: "Recepient is not deleted",
      });
      return;
    }

    await recepient.restore();

    res.json({
      success: true,
      message: "Recepient restored successfully",
      data: recepient,
    });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      message: "Error restoring recepient",
      error: err.message,
    });
  }
};

// DELETE /api/recepients/:id/permanent - Permanently delete recepient
export const permanentDeleteRecepient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid recepient ID format",
      });
      return;
    }

    const recepient = await RecepientModel.findByIdAndDelete(id);

    if (!recepient) {
      res.status(404).json({
        success: false,
        message: "Recepient not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Recepient permanently deleted",
    });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      message: "Error permanently deleting recepient",
      error: err.message,
    });
  }
};
