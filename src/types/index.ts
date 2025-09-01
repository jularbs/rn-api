export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  version: string;
}

export interface AppInfo {
  message: string;
  version: string;
  status: string;
}

// Station-related types
export interface CreateStationRequest {
  name: string;
  slug: string;
  frequency: string;
  address?: string;
  locationGroup: 'luzon' | 'visayas' | 'mindanao';
  logoImage?: string; // Will be handled as file upload
  contactNumber?: string;
  email?: string;
  mapEmbedCode?: string;
  audioStreamURL?: string;
  videoStreamURL?: string;
  status?: 'active' | 'inactive';
}

export interface UpdateStationRequest extends Partial<CreateStationRequest> {}

export type LocationGroup = 'luzon' | 'visayas' | 'mindanao';
export type StationStatus = 'active' | 'inactive';

// Category-related types
export interface CreateCategoryRequest {
  name: string;
  slug?: string;
  description?: string;
  parent?: string; // ObjectId as string
  isActive?: boolean;
  sortOrder?: number;
  metaTitle?: string;
  metaDescription?: string;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {}

export interface CategoryTreeItem {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parent?: string | null;
  isActive: boolean;
  sortOrder: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
  children: CategoryTreeItem[];
}

export interface ReorderCategoryRequest {
  categories: Array<{
    id: string;
    sortOrder: number;
  }>;
}
