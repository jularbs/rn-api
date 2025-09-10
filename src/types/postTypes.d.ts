import { Types } from 'mongoose';
import { PostStatus } from '../models/Post';

// Request types
export interface CreatePostRequest {
  title: string;
  excerpt?: string;
  content: string;
  author: string;
  category?: string;
  tags?: string[];
  featuredImage?: string;
  thumbnailImage?: string;
  status?: PostStatus;
  scheduledAt?: string;
  isBreaking?: boolean;
  isFeatured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface UpdatePostRequest {
  title?: string;
  excerpt?: string;
  content?: string;
  category?: string;
  tags?: string[];
  featuredImage?: string;
  thumbnailImage?: string;
  status?: PostStatus;
  scheduledAt?: string;
  isBreaking?: boolean;
  isFeatured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface PostQueryParams {
  page?: string;
  limit?: string;
  status?: PostStatus;
  category?: string;
  author?: string;
  tags?: string;
  search?: string;
  featured?: string;
  breaking?: string;
  sortBy?: 'createdAt' | 'publishedAt' | 'viewCount' | 'title';
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
}

export interface PostStatsQueryParams {
  days?: string;
  category?: string;
  author?: string;
}

export interface RelatedPostsQueryParams {
  limit?: string;
  category?: string;
  tags?: string;
}

// Response types
export interface PostResponse {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  author: {
    _id: Types.ObjectId;
    name: string;
    email: string;
    avatar?: string;
  };
  category?: {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    description?: string;
  };
  tags: Array<{
    _id: Types.ObjectId;
    name: string;
    slug: string;
    description?: string;
  }>;
  featuredImage?: {
    _id: Types.ObjectId;
    originalName: string;
    fileName: string;
    mimeType: string;
    size: number;
    url: string;
  };
  thumbnailImage?: {
    _id: Types.ObjectId;
    originalName: string;
    fileName: string;
    mimeType: string;
    size: number;
    url: string;
  };
  status: PostStatus;
  publishedAt?: Date;
  scheduledAt?: Date;
  viewCount: number;
  isBreaking: boolean;
  isFeatured: boolean;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostListResponse {
  posts: PostResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters?: {
    status?: PostStatus;
    category?: string;
    author?: string;
    tags?: string[];
    search?: string;
    featured?: boolean;
    breaking?: boolean;
    dateRange?: {
      startDate?: Date;
      endDate?: Date;
    };
  };
}

export interface PostStatsResponse {
  byStatus: Array<{
    _id: PostStatus;
    count: number;
    totalViews: number;
  }>;
  total: {
    totalPosts: number;
    totalViews: number;
    breakingNews: number;
    featuredPosts: number;
  };
  trending?: PostResponse[];
  mostViewed?: PostResponse[];
  recentlyPublished?: PostResponse[];
}

export interface PostAnalyticsResponse {
  post: PostResponse;
  analytics: {
    dailyViews: Array<{
      date: string;
      views: number;
    }>;
    totalViews: number;
    avgViewsPerDay: number;
    peakViewDate?: string;
    relatedPostsClicks?: number;
    socialShares?: number;
  };
}
