import { Request } from "express";
import { Types } from "mongoose";

export interface IMessageRequest extends Request {
  body: {
    stationId: string;
    reason: string;
    fullName: string;
    emailAddress: string;
    contactNumber: string;
    message: string;
  };
}

export interface IMessageUpdateRequest extends Request {
  body: {
    status?: "unread" | "read" | "replied" | "archived";
    reason?: string;
    fullName?: string;
    emailAddress?: string;
    contactNumber?: string;
    message?: string;
  };
}

export interface IMessageQuery {
  stationId?: string | Types.ObjectId;
  status?: "unread" | "read" | "replied" | "archived";
  emailAddress?: string;
  createdAt?: {
    $gte?: Date;
    $lte?: Date;
  };
  deletedAt?: null | { $ne: null };
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface IMessageResponse {
  _id: Types.ObjectId;
  stationId: Types.ObjectId | IStationResponse;
  reason: string;
  fullName: string;
  emailAddress: string;
  contactNumber: string;
  message: string;
  status: "unread" | "read" | "replied" | "archived";
  readAt?: Date;
  readBy?: Types.ObjectId | IUserResponse;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId | IUserResponse;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaginatedMessagesResponse {
  success: boolean;
  message: string;
  data: {
    messages: IMessageResponse[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalMessages: number;
      limit: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}

export interface IStationResponse {
  _id: Types.ObjectId;
  name: string;
  callLetters: string;
}

export interface IUserResponse {
  _id: Types.ObjectId;
  fullName: string;
  emailAddress: string;
}
