import { Types } from 'mongoose';
import { PostStatus, PostType } from '@/models/Post';

// Request types
export interface CreatePostRequest {
  title: string;
  excerpt?: string;
  content: string;
  author: string;
  categories?: string[];
  tags?: string[];
  type?: PostType;
  featuredImage?: string;
  featuredImageCaption?: string;
  thumbnailImage?: string;
  videoSourceUrl?: string;
  videoDuration?: string;
  status?: PostStatus;
  isFeatured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  canonicalUrl?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  robotsArchive?: boolean;
  robotsSnippet?: boolean;
  robotsImageIndex?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  ogUrl?: string;
  ogSiteName?: string;
  ogLocale?: string;
  ogImage?: string;
  ogImageAlt?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterSite?: string;
  twitterCreator?: string;
  twitterImage?: string;
  twitterImageAlt?: string;
  seoAuthor?: string;
  publisher?: string;
  focusKeyword?: string;
  readingTime?: string;
  metaImage?: string;
  metaImageAlt?: string;
}

export interface UpdatePostRequest {
  title?: string;
  excerpt?: string;
  content?: string;
  categories?: string[];
  tags?: string[];
  type?: PostType;
  featuredImage?: string;
  featuredImageCaption?: string;
  thumbnailImage?: string;
  videoSourceUrl?: string;
  videoDuration?: string;
  status?: PostStatus;
  isFeatured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  canonicalUrl?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  robotsArchive?: boolean;
  robotsSnippet?: boolean;
  robotsImageIndex?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  ogUrl?: string;
  ogSiteName?: string;
  ogLocale?: string;
  ogImage?: string;
  ogImageAlt?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterSite?: string;
  twitterCreator?: string;
  twitterImage?: string;
  twitterImageAlt?: string;
  seoAuthor?: string;
  publisher?: string;
  focusKeyword?: string;
  readingTime?: string;
  metaImage?: string;
  metaImageAlt?: string;
}

export interface PostQueryParams {
  page?: string;
  limit?: string;
  status?: PostStatus;
  type?: PostType;
  categories?: string;
  author?: string;
  tags?: string;
  search?: string;
  featured?: string;
  sortBy?: 'createdAt' | 'publishedAt' | 'viewCount' | 'title';
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
}

export interface PostStatsQueryParams {
  days?: string;
  categories?: string;
  author?: string;
}

export interface RelatedPostsQueryParams {
  limit?: string;
  categories?: string;
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
  categories: Array<{
    _id: Types.ObjectId;
    name: string;
    slug: string;
    description?: string;
  }>;
  tags: Array<{
    _id: Types.ObjectId;
    name: string;
    slug: string;
    description?: string;
  }>;
  type: PostType;
  featuredImage?: {
    _id: Types.ObjectId;
    originalName: string;
    fileName: string;
    mimeType: string;
    size: number;
    url: string;
  };
  featuredImageCaption?: string;
  thumbnailImage?: {
    _id: Types.ObjectId;
    originalName: string;
    fileName: string;
    mimeType: string;
    size: number;
    url: string;
  };
  videoSourceUrl?: string;
  videoDuration?: string;
  status: PostStatus;
  publishedAt?: Date;
  viewCount: number;
  isFeatured: boolean;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  canonicalUrl?: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  robotsArchive: boolean;
  robotsSnippet: boolean;
  robotsImageIndex: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  ogUrl?: string;
  ogSiteName?: string;
  ogLocale?: string;
  ogImage?: {
    _id: Types.ObjectId;
    originalName: string;
    fileName: string;
    mimeType: string;
    size: number;
    url: string;
  };
  ogImageAlt?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterSite?: string;
  twitterCreator?: string;
  twitterImage?: {
    _id: Types.ObjectId;
    originalName: string;
    fileName: string;
    mimeType: string;
    size: number;
    url: string;
  };
  twitterImageAlt?: string;
  seoAuthor?: string;
  publisher?: string;
  focusKeyword?: string;
  readingTime?: string;
  metaImage?: {
    _id: Types.ObjectId;
    originalName: string;
    fileName: string;
    mimeType: string;
    size: number;
    url: string;
  };
  metaImageAlt?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostListResponse {
  data: PostResponse[];
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
    categories?: string[];
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
