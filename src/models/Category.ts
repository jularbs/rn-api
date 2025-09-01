import {
  prop,
  getModelForClass,
  modelOptions,
  index,
  pre,
  DocumentType,
  Ref
} from "@typegoose/typegoose";
import { Types } from "mongoose";
import slugify from "slugify";

export interface ICategory {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  parent?: Ref<Category>;
  isActive: boolean;
  sortOrder: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;

  // Virtual fields
  fullPath: string;
  childrenCount: number;
}

// Pre-hook to generate slug from name if not provided
@pre<Category>("save", function (this: DocumentType<Category>) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
  }
})

@index({ createdAt: -1 })
@modelOptions({
  schemaOptions: {
    timestamps: true,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
})
export class Category {
  @prop({
    required: true,
    trim: true,
    maxlength: [100, "Category name cannot exceed 100 characters"],
    index: true
  })
  public name!: string;

  @prop({
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: [120, "Slug cannot exceed 120 characters"],
    index: true
  })
  public slug!: string;

  @prop({
    trim: true,
    maxlength: [500, "Description cannot exceed 500 characters"],
  })
  public description?: string;

  @prop({
    ref: () => Category,
    default: null,
    index: true
  })
  public parent?: Ref<Category>;

  @prop({
    default: true,
    index: true
  })
  public isActive!: boolean;

  @prop({
    default: 0,
    min: [0, "Sort order cannot be negative"],
    index: true
  })
  public sortOrder!: number;

  @prop({
    trim: true,
    maxlength: [60, "Meta title cannot exceed 60 characters"],
  })
  public metaTitle?: string;

  @prop({
    trim: true,
    maxlength: [160, "Meta description cannot exceed 160 characters"],
  })
  public metaDescription?: string;

  public createdAt!: Date;
  public updatedAt!: Date;

  // Virtual for full category path (for nested categories)
  public get fullPath(): string {
    // This would need to be implemented with population in queries
    // For now, return the current category name
    return this.name;
  }

  // Virtual for children count
  public get childrenCount(): number {
    // This would need to be calculated in queries
    return 0;
  }

  // Static method to find active categories only
  public static findActive() {
    return CategoryModel.find({ isActive: true });
  }

  // Static method to find all categories (including inactive)
  public static findAll() {
    return CategoryModel.find();
  }

  // Static method to find one active category
  public static findOneActive(filter: Record<string, unknown>) {
    return CategoryModel.findOne({ ...filter, isActive: true });
  }

  // Static method to find by slug (active only)
  public static findBySlugActive(slug: string) {
    return CategoryModel.findOne({ slug, isActive: true });
  }

  // Static method to find root categories (no parent)
  public static findRootCategories() {
    return CategoryModel.find({ 
      parent: null, 
      isActive: true 
    }).sort({ sortOrder: 1, name: 1 });
  }

  // Static method to find children of a category
  public static findChildren(parentId: string | Types.ObjectId) {
    return CategoryModel.find({ 
      parent: parentId, 
      isActive: true 
    }).sort({ sortOrder: 1, name: 1 });
  }

  // Static method to find category tree (with children populated)
  public static findCategoryTree() {
    return CategoryModel
      .find({ isActive: true })
      .populate('parent')
      .sort({ sortOrder: 1, name: 1 });
  }

  // Static method to count active categories
  public static countActive(filter: Record<string, unknown> = {}) {
    return CategoryModel.countDocuments({ 
      ...filter, 
      isActive: true 
    });
  }

  // Static method to get next sort order
  public static async getNextSortOrder(parentId?: string | Types.ObjectId): Promise<number> {
    const filter: Record<string, unknown> = {};
    if (parentId) {
      filter.parent = parentId;
    } else {
      filter.parent = null;
    }

    const lastCategory = await CategoryModel
      .findOne(filter)
      .sort({ sortOrder: -1 });

    return lastCategory ? lastCategory.sortOrder + 1 : 1;
  }
}

export const CategoryModel = getModelForClass(Category);
