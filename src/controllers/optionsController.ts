import { Request, Response } from "express";
import { OptionsModel } from "@/models/Options";
import { Types } from "mongoose";
import formidable from "formidable";
const { firstValues } = require("formidable/src/helpers/firstValues.js");
import { MediaModel } from "@/models/Media";
import fs from "fs";
import s3Helper from "@/utils/s3Helper";

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

    await option.populate("updatedBy media");

    res.json({
      success: true,
      message: "Option retrieved successfully",
      data: option,
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
    const form = formidable({
      multiples: false,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowEmptyFiles: true,
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    const formData = firstValues(form, fields);

    const { key, value } = formData;

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
    let mediaId: Types.ObjectId | undefined;
    const media = files.media;
    if (media) {
      try {
        const file = Array.isArray(media) ? media[0] : media;
        const fileBuffer = await fs.readFileSync(file.filepath);
        const uploadResult = await s3Helper.uploadFile(fileBuffer, file.originalFilename || "logo.jpg", {
          folder: "options",
          quality: 80,
        });

        const newMedia = new MediaModel({
          originalName: file.originalFilename,
          key: uploadResult.key,
          bucket: uploadResult.bucket,
          url: uploadResult.url,
          mimeType: uploadResult.mimeType,
        });
        const savedMedia = await newMedia.save();
        mediaId = savedMedia._id;
      } catch (uploadError) {
        const err = uploadError as Error;
        console.error("Media upload error:", err);
        res.status(500).json({
          success: false,
          message: "Error uploading media",
          error: err.message,
        });
        return;
      }
    }

    // Create or update option
    const option = await OptionsModel.setOption(key.trim(), value.trim(), updatedBy, mediaId);

    res.status(201).json({
      success: true,
      message: "Option created/updated successfully",
      data: option,
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
