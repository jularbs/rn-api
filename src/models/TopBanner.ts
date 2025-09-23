import { prop, getModelForClass, modelOptions, index, pre } from "@typegoose/typegoose";
import { Types } from "mongoose";
import slugify from "slugify";

// Enum for banner visibility
export enum BannerVisibility {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

// Interface for TopBanner
export interface ITopBanner {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  desktopBanner?: Types.ObjectId;
  tabletBanner?: Types.ObjectId;
  mobileBanner?: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  redirectLink?: string;
  visibility: BannerVisibility;
  clickCount: number;
  impressionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

@pre<TopBanner>("save", function () {
  if (this.isModified("name") || this.isNew) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true,
    });
  }
})
@index({ name: 1 })
@index({ visibility: 1 })
@index({ startDate: 1 })
@index({ endDate: 1 })
@index({ createdAt: -1 })
@modelOptions({
  schemaOptions: {
    timestamps: true,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
})
export class TopBanner implements ITopBanner {
  public _id!: Types.ObjectId;

  @prop({ required: true, trim: true, maxlength: 200 })
  public name!: string;

  @prop({ required: true, unique: true, lowercase: true })
  public slug!: string;

  @prop({ ref: "Media" })
  public desktopBanner?: Types.ObjectId;

  @prop({ ref: "Media" })
  public tabletBanner?: Types.ObjectId;

  @prop({ ref: "Media" })
  public mobileBanner?: Types.ObjectId;

  @prop({ required: true })
  public startDate!: Date;

  @prop({ required: true })
  public endDate!: Date;

  @prop({ trim: true })
  public redirectLink?: string;

  @prop({ enum: BannerVisibility, default: BannerVisibility.INACTIVE })
  public visibility!: BannerVisibility;

  @prop({ default: 0, min: 0 })
  public clickCount!: number;

  @prop({ default: 0, min: 0 })
  public impressionCount!: number;

  @prop({ default: Date.now })
  public createdAt!: Date;

  @prop({ default: Date.now })
  public updatedAt!: Date;

  // Instance method to increment click count
  public async incrementClicks() {
    return await TopBannerModel.findByIdAndUpdate(this._id, { $inc: { clickCount: 1 } }, { new: true });
  }

  // Instance method to increment impression count
  public async incrementImpressions() {
    return await TopBannerModel.findByIdAndUpdate(this._id, { $inc: { impressionCount: 1 } }, { new: true });
  }

  // Instance method to check if banner is currently active
  public isCurrentlyActive(): boolean {
    const now = new Date();
    return this.visibility === BannerVisibility.ACTIVE && this.startDate <= now && this.endDate >= now;
  }

  // Instance method to get click-through rate
  public getClickThroughRate(): number {
    if (this.impressionCount === 0) return 0;
    return (this.clickCount / this.impressionCount) * 100;
  }

  // Static method to get active banners for current time
  public static getActiveBanners() {
    const now = new Date();
    return TopBannerModel.find({
      visibility: BannerVisibility.ACTIVE,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .sort({ createdAt: -1 })
      .populate("desktopBanner tabletBanner mobileBanner");
  }

  // Static method to get expired banners
  public static getExpiredBanners() {
    const now = new Date();
    return TopBannerModel.find({
      endDate: { $lt: now },
    })
      .sort({ endDate: -1 })
      .populate("desktopBanner tabletBanner mobileBanner");
  }

  // Static method to get banners by date range
  public static getBannersByDateRange(startDate: Date, endDate: Date) {
    return TopBannerModel.find({
      $or: [
        {
          startDate: { $gte: startDate, $lte: endDate },
        },
        {
          endDate: { $gte: startDate, $lte: endDate },
        },
        {
          startDate: { $lte: startDate },
          endDate: { $gte: endDate },
        },
      ],
    })
      .sort({ startDate: 1 })
      .populate("desktopBanner tabletBanner mobileBanner");
  }

  // Static method to get banner performance stats
  public static async getBannerStats() {
    const stats = await TopBannerModel.aggregate([
      {
        $group: {
          _id: "$visibility",
          count: { $sum: 1 },
          totalClicks: { $sum: "$clickCount" },
          totalImpressions: { $sum: "$impressionCount" },
        },
      },
    ]);

    const totalStats = await TopBannerModel.aggregate([
      {
        $group: {
          _id: null,
          totalBanners: { $sum: 1 },
          totalClicks: { $sum: "$clickCount" },
          totalImpressions: { $sum: "$impressionCount" },
          avgClickThroughRate: {
            $avg: {
              $cond: [
                { $eq: ["$impressionCount", 0] },
                0,
                {
                  $multiply: [{ $divide: ["$clickCount", "$impressionCount"] }, 100],
                },
              ],
            },
          },
        },
      },
    ]);

    return {
      byVisibility: stats,
      total: totalStats[0] || {
        totalBanners: 0,
        totalClicks: 0,
        totalImpressions: 0,
        avgClickThroughRate: 0,
      },
    };
  }

  // Static method to get top performing banners
  public static getTopPerformingBanners(limit = 10, sortBy: "clicks" | "impressions" | "ctr" = "ctr") {
    switch (sortBy) {
      case "clicks":
        return TopBannerModel.find({})
          .sort({ clickCount: -1 })
          .limit(limit)
          .populate("desktopBanner tabletBanner mobileBanner");
      case "impressions":
        return TopBannerModel.find({})
          .sort({ impressionCount: -1 })
          .limit(limit)
          .populate("desktopBanner tabletBanner mobileBanner");
      case "ctr":
      default:
        return TopBannerModel.aggregate([
          {
            $addFields: {
              clickThroughRate: {
                $cond: [
                  { $eq: ["$impressionCount", 0] },
                  0,
                  {
                    $multiply: [{ $divide: ["$clickCount", "$impressionCount"] }, 100],
                  },
                ],
              },
            },
          },
          { $sort: { clickThroughRate: -1 } },
          { $limit: limit },
        ]);
    }
  }

  // Static method to cleanup expired banners
  public static async cleanupExpiredBanners(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return TopBannerModel.deleteMany({
      endDate: { $lt: cutoffDate },
      visibility: { $ne: BannerVisibility.ACTIVE },
    });
  }

  // Static method to auto-deactivate expired banners
  public static async autoDeactivateExpiredBanners() {
    const now = new Date();

    return TopBannerModel.updateMany(
      {
        visibility: BannerVisibility.ACTIVE,
        endDate: { $lt: now },
      },
      { $set: { visibility: BannerVisibility.INACTIVE } }
    );
  }

  // Static method to search banners
  public static searchBanners(query: string) {
    const searchRegex = new RegExp(query, "i");
    return TopBannerModel.find({
      $or: [{ name: searchRegex }, { redirectLink: searchRegex }],
    })
      .sort({ createdAt: -1 })
      .populate("desktopBanner tabletBanner mobileBanner");
  }
}

export const TopBannerModel = getModelForClass(TopBanner);
