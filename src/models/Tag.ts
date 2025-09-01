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

export interface ITag {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  isActive: boolean;
  usageCount: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;

  // Virtual fields
  isPopular: boolean;
}

// Pre-hook to generate slug from name if not provided
@pre<Tag>("save", function (this: DocumentType<Tag>) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
  }
})

@index({ name: 1 })
@index({ usageCount: -1 })
@index({ createdAt: -1 })
@modelOptions({
  schemaOptions: {
    timestamps: true,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
})
export class Tag {
  @prop({
    required: true,
    trim: true,
    maxlength: [50, "Tag name cannot exceed 50 characters"],
    index: true
  })
  public name!: string;

  @prop({
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: [60, "Slug cannot exceed 60 characters"],
    index: true
  })
  public slug!: string;

  @prop({
    trim: true,
    maxlength: [200, "Description cannot exceed 200 characters"],
  })
  public description?: string;

  @prop({
    trim: true,
    maxlength: [7, "Color must be a valid hex color code"],
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Color must be a valid hex color code (e.g., #FF0000)"],
  })
  public color?: string;

  @prop({
    default: true,
    index: true
  })
  public isActive!: boolean;

  @prop({
    default: 0,
    min: [0, "Usage count cannot be negative"],
    index: true
  })
  public usageCount!: number;

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

  // Virtual to determine if tag is popular (high usage)
  public get isPopular(): boolean {
    return this.usageCount >= 10; // Configurable threshold
  }

  // Instance method to increment usage count
  public async incrementUsage(this: DocumentType<Tag>): Promise<DocumentType<Tag>> {
    this.usageCount += 1;
    return await this.save();
  }

  // Instance method to decrement usage count
  public async decrementUsage(this: DocumentType<Tag>): Promise<DocumentType<Tag>> {
    if (this.usageCount > 0) {
      this.usageCount -= 1;
    }
    return await this.save();
  }

  // Instance method to reset usage count
  public async resetUsage(this: DocumentType<Tag>): Promise<DocumentType<Tag>> {
    this.usageCount = 0;
    return await this.save();
  }

  // Static method to find active tags only
  public static findActive() {
    return TagModel.find({ isActive: true });
  }

  // Static method to find all tags (including inactive)
  public static findAll() {
    return TagModel.find();
  }

  // Static method to find one active tag
  public static findOneActive(filter: Record<string, unknown>) {
    return TagModel.findOne({ ...filter, isActive: true });
  }

  // Static method to find by slug (active only)
  public static findBySlugActive(slug: string) {
    return TagModel.findOne({ slug, isActive: true });
  }

  // Static method to find popular tags (high usage)
  public static findPopular(limit: number = 10) {
    return TagModel
      .find({ isActive: true, usageCount: { $gte: 10 } })
      .sort({ usageCount: -1 })
      .limit(limit);
  }

  // Static method to find trending tags (recently used)
  public static findTrending(days: number = 30, limit: number = 10) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    
    return TagModel
      .find({ 
        isActive: true,
        updatedAt: { $gte: dateThreshold }
      })
      .sort({ usageCount: -1, updatedAt: -1 })
      .limit(limit);
  }

  // Static method to find unused tags
  public static findUnused() {
    return TagModel.find({ usageCount: 0, isActive: true });
  }

  // Static method to find tags by usage range
  public static findByUsageRange(min: number, max?: number) {
    const filter: Record<string, unknown> = { 
      isActive: true,
      usageCount: { $gte: min }
    };
    
    if (max !== undefined) {
      filter.usageCount = { $gte: min, $lte: max };
    }
    
    return TagModel.find(filter).sort({ usageCount: -1 });
  }

  // Static method to search tags by name
  public static search(query: string) {
    return TagModel.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ],
      isActive: true
    });
  }

  // Static method to get tags with similar names
  public static findSimilar(name: string, limit: number = 5) {
    return TagModel
      .find({
        name: { $regex: name, $options: 'i' },
        isActive: true
      })
      .limit(limit)
      .sort({ usageCount: -1 });
  }

  // Static method to count active tags
  public static countActive(filter: Record<string, unknown> = {}) {
    return TagModel.countDocuments({ 
      ...filter, 
      isActive: true 
    });
  }

  // Static method to get tag statistics
  public static async getTagStats() {
    const stats = await TagModel.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalTags: { $sum: 1 },
          totalUsage: { $sum: '$usageCount' },
          avgUsage: { $avg: '$usageCount' },
          maxUsage: { $max: '$usageCount' },
          minUsage: { $min: '$usageCount' }
        }
      }
    ]);

    return stats[0] || {
      totalTags: 0,
      totalUsage: 0,
      avgUsage: 0,
      maxUsage: 0,
      minUsage: 0
    };
  }

  // Static method to get usage distribution
  public static async getUsageDistribution() {
    return TagModel.aggregate([
      { $match: { isActive: true } },
      {
        $bucket: {
          groupBy: '$usageCount',
          boundaries: [0, 1, 5, 10, 25, 50, 100, Infinity],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            tags: { $push: '$name' }
          }
        }
      }
    ]);
  }

  // Static method to cleanup unused tags (optional - use with caution)
  public static async cleanupUnused(daysThreshold: number = 90) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysThreshold);
    
    return TagModel.deleteMany({
      usageCount: 0,
      createdAt: { $lt: dateThreshold }
    });
  }

  // Static method to bulk increment usage for multiple tags
  public static async bulkIncrementUsage(tagIds: (string | Types.ObjectId)[]) {
    return TagModel.updateMany(
      { _id: { $in: tagIds } },
      { $inc: { usageCount: 1 } }
    );
  }

  // Static method to bulk decrement usage for multiple tags
  public static async bulkDecrementUsage(tagIds: (string | Types.ObjectId)[]) {
    return TagModel.updateMany(
      { _id: { $in: tagIds }, usageCount: { $gt: 0 } },
      { $inc: { usageCount: -1 } }
    );
  }

  // Static method to find or create tags by names
  public static async findOrCreateByNames(names: string[]): Promise<DocumentType<Tag>[]> {
    const tags: DocumentType<Tag>[] = [];
    
    for (const name of names) {
      let tag = await TagModel.findOne({ name: name.trim(), isActive: true });
      
      if (!tag) {
        tag = new TagModel({
          name: name.trim(),
          slug: slugify(name.trim(), {
            lower: true,
            strict: true,
            remove: /[*+~.()'"!:@]/g
          })
        });
        await tag.save();
      }
      
      tags.push(tag);
    }
    
    return tags;
  }
}

export const TagModel = getModelForClass(Tag);
