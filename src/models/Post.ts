import { prop, getModelForClass, modelOptions, index, pre } from "@typegoose/typegoose";
import { Types } from "mongoose";
import slugify from "slugify";

// Enum for post status
export enum PostStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
}

// Interface for Post
export interface IPost {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  author: Types.ObjectId;
  category?: Types.ObjectId;
  tags: Types.ObjectId[];
  featuredImage?: Types.ObjectId;
  thumbnailImage?: Types.ObjectId;
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

@pre<Post>("save", function () {
  if (this.isModified("title") || this.isNew) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
      trim: true,
    });
  }

  // Set publishedAt when status changes to published
  if (this.isModified("status") && this.status === PostStatus.PUBLISHED && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  // Set scheduledAt to current date if it's empty
  if (!this.scheduledAt) {
    this.scheduledAt = new Date();
  }
})
@index({ slug: 1 }, { unique: true })
@index({ title: 1 })
@index({ category: 1 })
@index({ tags: 1 })
@index({ status: 1 })
@index({ scheduledAt: 1 })
@index({ publishedAt: -1 })
@index({ viewCount: -1 })
@index({ isBreaking: 1 })
@index({ isFeatured: 1 })
@index({ createdAt: -1 })
@modelOptions({
  schemaOptions: {
    timestamps: true,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
})
export class Post implements IPost {
  public _id!: Types.ObjectId;

  @prop({ required: true, trim: true, maxlength: 300 })
  public title!: string;

  @prop({ required: true, unique: true, lowercase: true })
  public slug!: string;

  @prop({ trim: true, maxlength: 500 })
  public excerpt?: string;

  @prop({ required: true })
  public content!: string;

  @prop({ required: true, ref: "User" })
  public author!: Types.ObjectId;

  @prop({ ref: "Category" })
  public category?: Types.ObjectId;

  @prop({ ref: "Tag", type: () => [Types.ObjectId], default: [] })
  public tags!: Types.ObjectId[];

  @prop({ ref: "Media" })
  public featuredImage?: Types.ObjectId;

  @prop({ ref: "Media" })
  public thumbnailImage?: Types.ObjectId;

  @prop({ enum: PostStatus, default: PostStatus.DRAFT })
  public status!: PostStatus;

  @prop()
  public publishedAt?: Date;

  @prop()
  public scheduledAt?: Date;

  @prop({ default: 0, min: 0 })
  public viewCount!: number;

  @prop({ default: false })
  public isBreaking!: boolean;

  @prop({ default: false })
  public isFeatured!: boolean;

  @prop({ trim: true, maxlength: 300 })
  public metaTitle?: string;

  @prop({ trim: true, maxlength: 500 })
  public metaDescription?: string;

  public createdAt!: Date;
  public updatedAt!: Date;

  // Instance method to increment view count
  public async incrementViews() {
    return await PostModel.findByIdAndUpdate(this._id, { $inc: { viewCount: 1 } }, { new: true });
  }

  // Instance method to publish post
  public async publish() {
    return await PostModel.findByIdAndUpdate(
      this._id,
      {
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      { new: true }
    );
  }

  // Static method to get published posts
  public static getPublishedPosts(limit = 10, skip = 0) {
    return PostModel.find({
      status: PostStatus.PUBLISHED,
      publishedAt: { $lte: new Date() },
    })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate("author category tags featuredImage thumbnailImage");
  }

  // Static method to get featured posts
  public static getFeaturedPosts(limit = 5) {
    return PostModel.find({
      status: PostStatus.PUBLISHED,
      isFeatured: true,
      publishedAt: { $lte: new Date() },
    })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .populate("author category tags featuredImage thumbnailImage");
  }

  // Static method to get breaking news
  public static getBreakingNews(limit = 3) {
    return PostModel.find({
      status: PostStatus.PUBLISHED,
      isBreaking: true,
      publishedAt: { $lte: new Date() },
    })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .populate("author category tags featuredImage thumbnailImage");
  }

  // Static method to get posts by category
  public static getByCategory(categoryId: string | Types.ObjectId, limit = 10, skip = 0) {
    const id = typeof categoryId === "string" ? new Types.ObjectId(categoryId) : categoryId;
    return PostModel.find({
      category: id,
      status: PostStatus.PUBLISHED,
      publishedAt: { $lte: new Date() },
    })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate("author category tags featuredImage thumbnailImage");
  }

  // Static method to get posts by author
  public static getByAuthor(authorId: string | Types.ObjectId, limit = 10, skip = 0) {
    const id = typeof authorId === "string" ? new Types.ObjectId(authorId) : authorId;
    return PostModel.find({
      author: id,
      status: PostStatus.PUBLISHED,
      publishedAt: { $lte: new Date() },
    })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate("author category tags featuredImage thumbnailImage");
  }

  // Static method to search posts
  public static searchPosts(query: string, limit = 10, skip = 0) {
    const searchRegex = new RegExp(query, "i");
    return PostModel.find({
      $or: [{ title: searchRegex }, { excerpt: searchRegex }, { content: searchRegex }],
      status: PostStatus.PUBLISHED,
      publishedAt: { $lte: new Date() },
    })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate("author category tags featuredImage thumbnailImage");
  }

  // Static method to get most viewed posts
  public static getMostViewed(limit = 10, days = 30) {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    return PostModel.find({
      status: PostStatus.PUBLISHED,
      publishedAt: { $gte: dateLimit, $lte: new Date() },
    })
      .sort({ viewCount: -1 })
      .limit(limit)
      .populate("author category tags featuredImage thumbnailImage");
  }

  // Static method to get related posts
  public static getRelatedPosts(
    postId: string | Types.ObjectId,
    categoryId?: Types.ObjectId,
    tagIds?: Types.ObjectId[],
    limit = 5
  ) {
    const id = typeof postId === "string" ? new Types.ObjectId(postId) : postId;
    const filter: Record<string, unknown> = {
      _id: { $ne: id },
      status: PostStatus.PUBLISHED,
      publishedAt: { $lte: new Date() },
    };

    if (categoryId) {
      filter.category = categoryId;
    } else if (tagIds && tagIds.length > 0) {
      filter.tags = { $in: tagIds };
    }

    return PostModel.find(filter)
      .sort({ publishedAt: -1 })
      .limit(limit)
      .populate("author category tags featuredImage thumbnailImage");
  }

  // Static method to get scheduled posts
  public static getScheduledPosts() {
    return PostModel.find({
      status: PostStatus.PUBLISHED,
      scheduledAt: { $lte: new Date() },
    })
      .sort({ scheduledAt: 1 })
      .populate("author category tags featuredImage thumbnailImage");
  }

  // Static method to get post statistics
  public static async getPostStats() {
    const stats = await PostModel.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalViews: { $sum: "$viewCount" },
        },
      },
    ]);

    const totalStats = await PostModel.aggregate([
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalViews: { $sum: "$viewCount" },
          breakingNews: { $sum: { $cond: ["$isBreaking", 1, 0] } },
          featuredPosts: { $sum: { $cond: ["$isFeatured", 1, 0] } },
        },
      },
    ]);

    return {
      byStatus: stats,
      total: totalStats[0] || {
        totalPosts: 0,
        totalViews: 0,
        breakingNews: 0,
        featuredPosts: 0,
      },
    };
  }

  // Static method to get trending posts
  public static getTrendingPosts(limit = 10, days = 7) {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    return PostModel.aggregate([
      {
        $match: {
          status: PostStatus.PUBLISHED,
          publishedAt: { $gte: dateLimit, $lte: new Date() },
        },
      },
      {
        $addFields: {
          trendingScore: {
            $add: [
              { $multiply: ["$viewCount", 1] },
              { $cond: ["$isFeatured", 10, 0] },
              { $cond: ["$isBreaking", 15, 0] },
            ],
          },
        },
      },
      { $sort: { trendingScore: -1 } },
      { $limit: limit },
    ]);
  }
}

export const PostModel = getModelForClass(Post);
