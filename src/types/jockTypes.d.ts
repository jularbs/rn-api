import { Types } from "mongoose";

// Base Jock Types
export interface IJockBase {
  name: string;
  slug: string;
  bio?: string;
  email?: string;
  image?: Types.ObjectId;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    website?: string;
  };
  isActive: boolean;
  programs: Types.ObjectId[];
}

export interface IJock extends IJockBase {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Request Types
export interface CreateJockRequest {
  name: string;
  slug?: string;
  bio?: string;
  email?: string;
  image?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    website?: string;
  };
  isActive?: boolean;
  programs?: string[];
}

export interface UpdateJockRequest {
  name?: string;
  slug?: string;
  bio?: string;
  email?: string;
  image?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    website?: string;
  };
  isActive?: boolean;
  programs?: string[];
}

export interface JockFilters {
  page?: string;
  limit?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  isActive?: string;
  withPrograms?: string;
}

export interface JockPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Response Types
export interface JockResponse {
  success: boolean;
  message: string;
  data: {
    jock: IJock;
  };
}

export interface JocksResponse {
  success: boolean;
  message: string;
  data: IJock[];
  pagination: JockPagination;
}

export interface SearchJocksResponse {
  success: boolean;
  message: string;
  data: IJock[];
}

// Program Management Types
export interface AddProgramRequest {
  programId: string;
}

export interface RemoveProgramRequest {
  programId: string;
}

// Statistics Types
export interface JockStats {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  totalPrograms: number;
  isActive: boolean;
}

// Populated Jock Types (for responses with populated references)
export interface PopulatedJock extends Omit<IJock, "image" | "programs"> {
  image?: {
    _id: Types.ObjectId;
    filename: string;
    url: string;
  };
  programs: Array<{
    _id: Types.ObjectId;
    title: string;
    slug: string;
    description?: string;
  }>;
}

export interface PopulatedJockResponse {
  success: boolean;
  message: string;
  data: {
    jock: PopulatedJock;
  };
}

export interface PopulatedJocksResponse {
  success: boolean;
  message: string;
  data: PopulatedJock[];
  pagination: JockPagination;
}

// Sort options
export type JockSortField = "name" | "slug" | "email" | "createdAt" | "updatedAt";

// Search options
export interface JockSearchOptions {
  query: string;
  fields?: string[];
  limit?: number;
}

// Error types
export interface JockError {
  success: false;
  message: string;
  error?: string;
  errors?: string[];
}

// Validation types
export interface JockValidation {
  isValidEmail?: boolean;
  isValidSlug?: boolean;
  slugExists?: boolean;
  requiredFields?: string[];
}
