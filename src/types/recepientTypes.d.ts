import { Types } from "mongoose";

// Recepient-related types
export interface CreateRecepientRequest {
  reason: string;
  email?: string;
  isActive?: boolean;
  description?: string;
}

export interface UpdateRecepientRequest extends Partial<CreateRecepientRequest> {}

export interface RecepientItem {
  _id: Types.ObjectId | string;
  reason: string;
  email?: string;
  isActive: boolean;
  description?: string;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecepientQueryParams {
  page?: string | number;
  limit?: string | number;
  isActive?: string | boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface RecepientListResponse {
  success: boolean;
  data: RecepientItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RecepientResponse {
  success: boolean;
  message?: string;
  data?: RecepientItem;
  errors?: string[];
}
