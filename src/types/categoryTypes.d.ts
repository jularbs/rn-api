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
