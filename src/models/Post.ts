import { prop, getModelForClass, modelOptions, index, pre } from "@typegoose/typegoose";
import { Types } from "mongoose";
import slugify from "slugify";

// Enum for post status
export enum PostStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
}

// Enum for post type
export enum PostType {
  BASIC_ARTICLE = "basic article",
  VIDEO_ARTICLE = "video article",
}

// Interface for Post
export interface IPost {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  author: Types.ObjectId;
  categories: Types.ObjectId[];
  tags: Types.ObjectId[];
  type: PostType;
  featuredImage?: Types.ObjectId;
  featuredImageCaption?: string;
  thumbnailImage?: Types.ObjectId;
  videoSourceUrl?: string;
  videoDuration?: string;
  status: PostStatus;
  publishedAt?: Date;
  viewCount: number;
  isFeatured: boolean;
  metaTitle?: string;
  metaDescription?: string;

  // SEO Fields
  keywords?: string;
  canonicalUrl?: string;

  // Robots meta
  robotsIndex: boolean;
  robotsFollow: boolean;
  robotsArchive: boolean;
  robotsSnippet: boolean;
  robotsImageIndex: boolean;

  // Open Graph
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  ogUrl?: string;
  ogSiteName?: string;
  ogLocale?: string;
  ogImage?: Types.ObjectId;
  ogImageAlt?: string;

  // Twitter Cards
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterSite?: string;
  twitterCreator?: string;
  twitterImage?: Types.ObjectId;
  twitterImageAlt?: string;

  // Additional SEO
  seoAuthor?: string;
  publisher?: string;
  focusKeyword?: string;
  readingTime?: string;
  metaImage?: Types.ObjectId;
  metaImageAlt?: string;
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
})
@index({ title: 1 })
@index({ categories: 1 })
@index({ tags: 1 })
@index({ type: 1 })
@index({ status: 1 })
@index({ publishedAt: -1 })
@index({ viewCount: -1 })
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

  @prop({ type: String, required: true, trim: true, maxlength: 300 })
  public title!: string;

  @prop({ type: String, required: true, unique: true, lowercase: true })
  public slug!: string;

  @prop({ type: String, trim: true, maxlength: 500 })
  public excerpt?: string;

  @prop({ type: String, required: true })
  public content!: string;

  @prop({ required: true, ref: "User" })
  public author!: Types.ObjectId;

  @prop({ ref: "Category", type: () => [Types.ObjectId], default: [] })
  public categories!: Types.ObjectId[];

  @prop({ ref: "Tag", type: () => [Types.ObjectId], default: [] })
  public tags!: Types.ObjectId[];

  @prop({ type: String, enum: PostType, default: PostType.BASIC_ARTICLE })
  public type!: PostType;

  @prop({ ref: "Media" })
  public featuredImage?: Types.ObjectId;

  @prop({ type: String, trim: true, maxlength: 500 })
  public featuredImageCaption?: string;

  @prop({ ref: "Media" })
  public thumbnailImage?: Types.ObjectId;

  @prop({ type: String, trim: true })
  public videoSourceUrl?: string;

  @prop({ type: String, trim: true, maxlength: 20 })
  public videoDuration?: string;

  @prop({ type: String, enum: PostStatus, default: PostStatus.DRAFT })
  public status!: PostStatus;

  @prop({ type: Date })
  public publishedAt?: Date;

  @prop({ type: Number, default: 0, min: 0 })
  public viewCount!: number;

  @prop({ type: Boolean, default: false })
  public isFeatured!: boolean;

  @prop({ type: String, trim: true, maxlength: 300 })
  public metaTitle?: string;

  @prop({ type: String, trim: true, maxlength: 500 })
  public metaDescription?: string;

  @prop({ type: String, trim: true })
  public keywords?: string;

  @prop({ type: String, trim: true })
  public canonicalUrl?: string;

  // Robots meta
  @prop({ type: Boolean, default: true })
  public robotsIndex!: boolean;

  @prop({ type: Boolean, default: true })
  public robotsFollow!: boolean;

  @prop({ type: Boolean, default: true })
  public robotsArchive!: boolean;

  @prop({ type: Boolean, default: true })
  public robotsSnippet!: boolean;

  @prop({ type: Boolean, default: true })
  public robotsImageIndex!: boolean;

  // Open Graph
  @prop({ type: String, trim: true, maxlength: 300 })
  public ogTitle?: string;

  @prop({ type: String, trim: true, maxlength: 500 })
  public ogDescription?: string;

  @prop({ type: String, trim: true })
  public ogType?: string;

  @prop({ type: String, trim: true })
  public ogUrl?: string;

  @prop({ type: String, trim: true })
  public ogSiteName?: string;

  @prop({ type: String, trim: true })
  public ogLocale?: string;

  @prop({ ref: "Media" })
  public ogImage?: Types.ObjectId;

  @prop({ type: String, trim: true })
  public ogImageAlt?: string;

  // Twitter Cards
  @prop({ type: String, trim: true })
  public twitterCard?: string;

  @prop({ type: String, trim: true, maxlength: 300 })
  public twitterTitle?: string;

  @prop({ type: String, trim: true, maxlength: 500 })
  public twitterDescription?: string;

  @prop({ type: String, trim: true })
  public twitterSite?: string;

  @prop({ type: String, trim: true })
  public twitterCreator?: string;

  @prop({ ref: "Media" })
  public twitterImage?: Types.ObjectId;

  @prop({ type: String, trim: true })
  public twitterImageAlt?: string;

  // Additional SEO
  @prop({ type: String, trim: true })
  public seoAuthor?: string;

  @prop({ type: String, trim: true })
  public publisher?: string;

  @prop({ type: String, trim: true })
  public focusKeyword?: string;

  @prop({ type: String, trim: true })
  public readingTime?: string;

  @prop({ ref: "Media" })
  public metaImage?: Types.ObjectId;

  @prop({ type: String, trim: true })
  public metaImageAlt?: string;

  public createdAt!: Date;
  public updatedAt!: Date;

  // Instance method to increment view count
  public async incrementViews() {
    return await PostModel.findByIdAndUpdate(this._id, { $inc: { viewCount: 1 } }, { new: true });
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
      .populate("author categories tags featuredImage thumbnailImage");
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
      .populate("author categories tags featuredImage thumbnailImage");
  }

  // Static method to get related posts
  public static getRelatedPosts(
    postId: string | Types.ObjectId,
    categoryIds?: Types.ObjectId[],
    tagIds?: Types.ObjectId[],
    limit = 5
  ) {
    const id = typeof postId === "string" ? new Types.ObjectId(postId) : postId;
    const filter: Record<string, unknown> = {
      _id: { $ne: id },
      status: PostStatus.PUBLISHED,
      publishedAt: { $lte: new Date() },
    };

    if (categoryIds && categoryIds.length > 0) {
      filter.categories = { $in: categoryIds };
    } else if (tagIds && tagIds.length > 0) {
      filter.tags = { $in: tagIds };
    }

    return PostModel.find(filter)
      .sort({ publishedAt: -1 })
      .limit(limit)
      .populate("author categories tags featuredImage thumbnailImage");
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
          featuredPosts: { $sum: { $cond: ["$isFeatured", 1, 0] } },
        },
      },
    ]);

    return {
      byStatus: stats,
      total: totalStats[0] || {
        totalPosts: 0,
        totalViews: 0,
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
            $add: [{ $multiply: ["$viewCount", 1] }, { $cond: ["$isFeatured", 10, 0] }],
          },
        },
      },
      { $sort: { trendingScore: -1 } },
      { $limit: limit },
    ]);
  }
}

export const PostModel = getModelForClass(Post);
