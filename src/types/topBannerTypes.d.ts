import { Types } from "mongoose";
import { BannerVisibility } from "@/models/TopBanner";

// Request types for creating/updating top banners
export interface CreateTopBannerRequest {
  name: string;
  desktopBanner?: string;
  tabletBanner?: string;
  mobileBanner?: string;
  startDate: string | Date;
  endDate: string | Date;
  redirectLink?: string;
  visibility?: BannerVisibility;
}

export interface UpdateTopBannerRequest {
  name?: string;
  desktopBanner?: string;
  tabletBanner?: string;
  mobileBanner?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  redirectLink?: string;
  visibility?: BannerVisibility;
}

// Query parameters for filtering top banners
export interface GetTopBannersQuery {
  page?: string;
  limit?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  visibility?: BannerVisibility;
  active?: "true" | "false";
}

export interface SearchBannersQuery {
  query: string;
}

// Response types
export interface TopBannerResponse {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  desktopBanner?: {
    _id: Types.ObjectId;
    filename: string;
    url: string;
  };
  tabletBanner?: {
    _id: Types.ObjectId;
    filename: string;
    url: string;
  };
  mobileBanner?: {
    _id: Types.ObjectId;
    filename: string;
    url: string;
  };
  startDate: Date;
  endDate: Date;
  redirectLink?: string;
  visibility: BannerVisibility;
  clickCount: number;
  impressionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TopBannersListResponse {
  banners: TopBannerResponse[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Analytics and statistics types
export interface BannerPerformanceStats {
  byVisibility: Array<{
    _id: BannerVisibility;
    count: number;
    totalClicks: number;
    totalImpressions: number;
  }>;
  total: {
    totalBanners: number;
    totalClicks: number;
    totalImpressions: number;
    avgClickThroughRate: number;
  };
}

export interface TopPerformingBanner extends TopBannerResponse {
  clickThroughRate?: number;
}

// Visibility states
export { BannerVisibility } from "@/models/TopBanner";

// Common banner positions/types for reference
export interface BannerPositions {
  TOP: "top";
  SIDE: "side";
  BOTTOM: "bottom";
  POPUP: "popup";
  INLINE: "inline";
}

// Device types for responsive banners
export interface DeviceTypes {
  DESKTOP: "desktop";
  TABLET: "tablet";
  MOBILE: "mobile";
}

// Banner status helpers
export interface BannerStatus {
  SCHEDULED: "scheduled";
  ACTIVE: "active";
  EXPIRED: "expired";
  INACTIVE: "inactive";
}
