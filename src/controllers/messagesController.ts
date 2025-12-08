import { Request, Response } from "express";
import { Types } from "mongoose";
import { MessageModel } from "../models/Message";
import sanitize from "mongo-sanitize";

// Controller to handle message-related operations

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "10", stationId, search } = req.query;
    const filter: Record<string, unknown> = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (stationId) {
      if (Types.ObjectId.isValid(String(stationId))) {
        filter.stationId = new Types.ObjectId(String(stationId));
      } else {
        return res.status(400).json({ success: false, message: "Invalid Station ID" });
      }
    }

    if (search) {
      filter.$or = [{ fullName: { $regex: search, $options: "i" } }, { message: { $regex: search, $options: "i" } }];
    }

    // Pagination
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const messages = await MessageModel.find(filter)
      .select("-message")
      .populate("readBy", "fullName")
      .populate("reason", "reason")
      .populate("deletedBy", "fullName")
      .populate("stationId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .exec();

    // Get total count for pagination
    const total = await MessageModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      message: "Messages retrieved successfully",
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      data: messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "There was an error retrieving messages",
      error,
    });
  }
};

export const markMessageAsRead = async (req: Request, res: Response) => {
  try {
    const messageId = req.params.id;

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const userId = req.user._id; // Assuming userId is sent in the request body

    if (!Types.ObjectId.isValid(messageId) || !Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const message = await MessageModel.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    await message.markAsRead(new Types.ObjectId(userId));

    res.status(200).json({ success: true, message: "Message marked as read" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "There was a problem marking the message as read", error });
  }
};

export const markMessageAsUnread = async (req: Request, res: Response) => {
  try {
    const messageId = req.params.id;

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const message = await MessageModel.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    await message.markAsUnread();

    res.status(200).json({ success: true, message: "Message marked as unread" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "There was a problem marking the message as unread", error });
  }
};

export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const messageId = req.params.id;

    if (!Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const message = await MessageModel.findByIdAndDelete(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    res.status(200).json({ success: true, message: "Message deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const getMessageById = async (req: Request, res: Response) => {
  try {
    const messageId = req.params.id;

    if (!Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const message = await MessageModel.findById(messageId)
      .populate("stationId", "name")
      .populate("reason", "reason")
      .populate("readBy", "fullName")
      .populate("deletedBy", "fullName")
      .exec();

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    res.status(200).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const createMessage = async (req: Request, res: Response) => {
  try {
    const { stationId, reason, fullName, emailAddress, contactNumber, message } = req.body;

    // Remove extra whitespace and line breaks from message
    const cleanedMessage = sanitize(message).replace(/\s+/g, " ").trim();

    const newMessage = new MessageModel({
      stationId: sanitize(stationId),
      reason: sanitize(reason),
      fullName: sanitize(fullName),
      emailAddress: sanitize(emailAddress),
      contactNumber: sanitize(contactNumber),
      message: message,
      excerpt: cleanedMessage.substring(0, 180),
      status: "unread",
    });

    await newMessage.save();

    res.status(201).json({ success: true, data: newMessage });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: "There was a problem sending the inquiry, please try again later", error });
  }
};

export const getUnreadMessageCount = async (req: Request, res: Response) => {
  try {
    const filter: Record<string, unknown> = { status: "unread" };

    if (req.query.stationId) {
      const stationId = req.query.stationId as string;
      if (Types.ObjectId.isValid(stationId)) {
        filter.stationId = new Types.ObjectId(stationId);
      } else {
        return res.status(400).json({ success: false, message: "Invalid Station ID" });
      }
    }

    const count = await MessageModel.countDocuments(filter);

    res.status(200).json({ success: true, data: count });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "There was an error retrieving unread message count",
      error,
    });
  }
};
