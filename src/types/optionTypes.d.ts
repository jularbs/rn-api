import { Types } from "mongoose";

// Request types for creating/updating options
export interface CreateOptionRequest {
  key: string;
  value: string;
  media?: string;
}

export interface UpdateOptionRequest {
  value: string;
  media?: string;
}

export interface BulkUpdateRequest {
  key: string;
  value: string;
  media?: string;
}

// Query parameters for filtering options
export interface GetOptionsQuery {
  page?: string;
  limit?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  updatedBy?: string;
  hasMedia?: "true" | "false";
}

export interface SearchOptionsQuery {
  query: string;
}

// Response types
export interface OptionResponse {
  _id: Types.ObjectId;
  key: string;
  value: string;
  updatedBy: {
    _id: Types.ObjectId;
    name: string;
    email: string;
  };
  media?: {
    _id: Types.ObjectId;
    filename: string;
    url: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface OptionsListResponse {
  options: OptionResponse[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface BulkUpdateResponse {
  modifiedCount: number;
  insertedCount: number;
  upsertedCount: number;
}

// Option categories for better organization (optional)
export interface OptionCategory {
  GENERAL: "general";
  THEME: "theme";
  SEO: "seo";
  SOCIAL: "social";
  API: "api";
  NOTIFICATION: "notification";
  SECURITY: "security";
  PERFORMANCE: "performance";
}

// Common option keys (for type safety)
export interface OptionKeys {
  SITE_TITLE: "site_title";
  SITE_DESCRIPTION: "site_description";
  SITE_LOGO: "site_logo";
  SITE_FAVICON: "site_favicon";
  CONTACT_EMAIL: "contact_email";
  SOCIAL_FACEBOOK: "social_facebook";
  SOCIAL_TWITTER: "social_twitter";
  SOCIAL_INSTAGRAM: "social_instagram";
  THEME_PRIMARY_COLOR: "theme_primary_color";
  THEME_SECONDARY_COLOR: "theme_secondary_color";
  API_RATE_LIMIT: "api_rate_limit";
  NOTIFICATION_EMAIL: "notification_email";
  SEO_META_TITLE: "seo_meta_title";
  SEO_META_DESCRIPTION: "seo_meta_description";
  MAINTENANCE_MODE: "maintenance_mode";
}
