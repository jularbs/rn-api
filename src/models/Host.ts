import { prop, getModelForClass, modelOptions, index, pre } from '@typegoose/typegoose';
import { Types } from 'mongoose';
import slugify from 'slugify';

// Interface for Host
export interface IHost {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  bio?: string;
  email?: string;
  image?: Types.ObjectId;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    tiktok?: string;
  };
  isActive: boolean;
  programs: Types.ObjectId[]; // References to Program model
  createdAt: Date;
  updatedAt: Date;
}

@pre<Host>("save", function () {
  if (this.isModified("name") || this.isNew) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true,
    });
  }
})
@index({ name: 1 })
@index({ isActive: 1 })
@index({ programs: 1 })
@modelOptions({
  schemaOptions: {
    timestamps: true,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
})
export class Host {
  public _id!: Types.ObjectId;

  @prop({ required: true, trim: true, maxlength: 200 })
  public name!: string;

  @prop({ required: true, unique: true, lowercase: true })
  public slug!: string;

  @prop({ trim: true, maxlength: 2000 })
  public bio?: string;

  @prop({ trim: true, lowercase: true })
  public email?: string;

  @prop({ ref: "Media" })
  public image?: Types.ObjectId;

  @prop({ type: () => Object })
  public socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    tiktok?: string;
  };

  @prop({ default: true })
  public isActive!: boolean;

  @prop({ ref: "Program", type: () => [Types.ObjectId], default: [] })
  public programs!: Types.ObjectId[];

  public createdAt!: Date;
  public updatedAt!: Date;

  // Instance method to add a program
  public async addProgram(programId: string | Types.ObjectId) {
    const id = typeof programId === "string" ? new Types.ObjectId(programId) : programId;
    if (!this.programs.includes(id)) {
      this.programs.push(id);
    }
    return await HostModel.findByIdAndUpdate(this._id, { $addToSet: { programs: id } }, { new: true });
  }

  // Instance method to remove a program
  public async removeProgram(programId: string | Types.ObjectId) {
    const id = typeof programId === "string" ? new Types.ObjectId(programId) : programId;
    return await HostModel.findByIdAndUpdate(this._id, { $pull: { programs: id } }, { new: true });
  }

  // Instance method to get program count
  public getProgramCount(): number {
    return this.programs.length;
  }

  // Static method to find hosts with programs
  public static findWithPrograms() {
    return HostModel.find({
      programs: { $exists: true, $not: { $size: 0 } },
      isActive: true,
    }).populate("programs image");
  }

  // Static method to get host statistics
  public static async getHostStats() {
    const stats = await HostModel.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalHosts: { $sum: 1 },
          avgProgramsPerHost: { $avg: { $size: "$programs" } },
          hostsWithPrograms: {
            $sum: {
              $cond: [{ $gt: [{ $size: "$programs" }, 0] }, 1, 0],
            },
          },
        },
      },
    ]);

    return (
      stats[0] || {
        totalHosts: 0,
        avgProgramsPerHost: 0,
        hostsWithPrograms: 0,
      }
    );
  }

  // Static method to search hosts
  public static searchHosts(query: string) {
    const searchRegex = new RegExp(query, "i");
    return HostModel.find({
      $or: [{ name: searchRegex }, { bio: searchRegex }],
      isActive: true,
    }).populate("programs image");
  }

  // Static method to get top hosts by program count
  public static getTopHostsByPrograms(limit = 10) {
    return HostModel.aggregate([
      { $match: { isActive: true } },
      {
        $addFields: {
          programCount: { $size: "$programs" },
        },
      },
      { $sort: { programCount: -1 } },
      { $limit: limit },
    ]);
  }
}

export const HostModel = getModelForClass(Host);
