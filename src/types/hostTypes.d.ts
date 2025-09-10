import { Types } from "mongoose";

// Base Host Types
export interface IHostBase {
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

export interface IHost extends IHostBase {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Request Types
export interface CreateHostRequest {
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

export interface UpdateHostRequest {
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

export interface HostFilters {
  page?: string;
  limit?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  isActive?: string;
  withPrograms?: string;
}

export interface HostPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Response Types
export interface HostResponse {
  success: boolean;
  message: string;
  data: {
    host: IHost;
  };
}

export interface HostsResponse {
  success: boolean;
  message: string;
  data: {
    hosts: IHost[];
    pagination: HostPagination;
  };
}

export interface SearchHostsResponse {
  success: boolean;
  message: string;
  data: {
    hosts: IHost[];
  };
}

// Program Management Types
export interface AddProgramRequest {
  programId: string;
}

export interface RemoveProgramRequest {
  programId: string;
}

// Statistics Types
export interface HostStats {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  totalPrograms: number;
  isActive: boolean;
}

// Populated Host Types (for responses with populated references)
export interface PopulatedHost extends Omit<IHost, 'image' | 'programs'> {
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

export interface PopulatedHostResponse {
  success: boolean;
  message: string;
  data: {
    host: PopulatedHost;
  };
}

export interface PopulatedHostsResponse {
  success: boolean;
  message: string;
  data: {
    hosts: PopulatedHost[];
    pagination: HostPagination;
  };
}

// Sort options
export type HostSortField = "name" | "slug" | "email" | "createdAt" | "updatedAt";

// Search options
export interface HostSearchOptions {
  query: string;
  fields?: string[];
  limit?: number;
}

// Error types
export interface HostError {
  success: false;
  message: string;
  error?: string;
  errors?: string[];
}

// Validation types
export interface HostValidation {
  isValidEmail?: boolean;
  isValidSlug?: boolean;
  slugExists?: boolean;
  requiredFields?: string[];
}

// Export all types
export type {
  IHostBase,
  IHost,
  CreateHostRequest,
  UpdateHostRequest,
  HostFilters,
  HostPagination,
  HostResponse,
  HostsResponse,
  SearchHostsResponse,
  AddProgramRequest,
  RemoveProgramRequest,
  HostStats,
  PopulatedHost,
  PopulatedHostResponse,
  PopulatedHostsResponse,
  HostSortField,
  HostSearchOptions,
  HostError,
  HostValidation,
};
