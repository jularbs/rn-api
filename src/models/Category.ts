import {
  prop,
  getModelForClass,
  modelOptions,
  index,
  pre,
  DocumentType
} from "@typegoose/typegoose";
import { Types } from "mongoose";
import slugify from "slugify";

export interface ICategory {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
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
    type: String,
    required: true,
    trim: true,
    maxlength: [100, "Category name cannot exceed 100 characters"],
    index: true
  })
  public name!: string;

  @prop({
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: [120, "Slug cannot exceed 120 characters"],
    index: true
  })
  public slug!: string;

  @prop({
    type: String,
    trim: true,
    maxlength: [500, "Description cannot exceed 500 characters"],
  })
  public description?: string;

  @prop({
    type: Boolean,
    default: true,
    index: true
  })
  public isActive!: boolean;

  @prop({
    type: Number,
    default: 0,
    min: [0, "Sort order cannot be negative"],
    index: true
  })
  public sortOrder!: number;

  @prop({
    type: String,
    trim: true,
    maxlength: [60, "Meta title cannot exceed 60 characters"],
  })
  public metaTitle?: string;

  @prop({
    type: String,
    trim: true,
    maxlength: [160, "Meta description cannot exceed 160 characters"],
  })
  public metaDescription?: string;

  public createdAt!: Date;
  public updatedAt!: Date;

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

  // Static method to count active categories
  public static countActive(filter: Record<string, unknown> = {}) {
    return CategoryModel.countDocuments({ 
      ...filter, 
      isActive: true 
    });
  }

  // Static method to get next sort order
  public static async getNextSortOrder(): Promise<number> {
    const lastCategory = await CategoryModel
      .findOne({})
      .sort({ sortOrder: -1 });

    return lastCategory ? lastCategory.sortOrder + 1 : 1;
  }
}

export const CategoryModel = getModelForClass(Category);
