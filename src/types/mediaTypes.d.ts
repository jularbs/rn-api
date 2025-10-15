import { Types } from "mongoose";

export interface IMediaRequest {
  originalName: string;
  key: string;
  bucket: string;
  url?: string;
  mimeType: string;
  size: number;
  alt?: string;
  caption?: string;
}

export interface IMediaUpdateRequest {
  originalName?: string;
  key?: string;
  bucket?: string;
  url?: string;
  mimeType?: string;
  size?: number;
  alt?: string;
  caption?: string;
}

export interface IMediaResponse {
  _id: Types.ObjectId;
  originalName: string;
  key: string;
  bucket: string;
  url?: string;
  mimeType: string;
  size: number;
  alt?: string;
  caption?: string;
  isImage: boolean;
  isVideo: boolean;
  isAudio: boolean;
  isDocument: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMediaSearchQuery {
  page?: string;
  limit?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  mimeType?: string;
  bucket?: string;
  fileType?: "image" | "video" | "audio" | "document";
}

export interface IMediaPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface IMediaListResponse {
  success: boolean;
  message: string;
  data: IMediaResponse[];
  pagination: IMediaPagination;
}

export interface IMediaSingleResponse {
  success: boolean;
  message: string;
  data: {
    media: IMediaResponse;
  };
}

export interface IMediaSearchResponse {
  success: boolean;
  message: string;
  data: {
    media: IMediaResponse[];
  };
}

export type MediaFileType = "images" | "videos" | "audio" | "documents";

export interface IMediaStats {
  totalFiles: number;
  totalSize: number;
  imageCount: number;
  videoCount: number;
  audioCount: number;
  documentCount: number;
  otherCount: number;
}

export interface IMediaBucketStats {
  bucket: string;
  count: number;
  totalSize: number;
}
