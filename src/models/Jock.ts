import { prop, getModelForClass, modelOptions, index, pre, Severity } from "@typegoose/typegoose";
import { Types } from "mongoose";
import slugify from "slugify";
import { Program } from "./Program";
import { Media } from "./Media";
import { Station } from "./Station";

// Interface for Jock
export interface IJock {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  bio?: string;
  image?: Types.ObjectId;
  station?: Types.ObjectId; // Reference to Station model
  socialLinks?: {
    facebook?: string;
    youtube?: string,
    twitter?: string;
    instagram?: string;
    tiktok?: string;
  };
  isActive: boolean;
  programs: Types.ObjectId[]; // References to Program model
  createdAt: Date;
  updatedAt: Date;
}

@pre<Jock>("save", function () {
  if (this.isModified("name") || this.isNew) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true,
    });
  }
})
@index({ name: 1 })
@index({ programs: 1 })
@modelOptions({
  schemaOptions: {
    timestamps: true,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class Jock {
  public _id!: Types.ObjectId;

  @prop({ type: String, required: true, trim: true, maxlength: 200 })
  public name!: string;

  @prop({ type: String, required: true, unique: true, lowercase: true })
  public slug!: string;

  @prop({ type: String, trim: true, maxlength: 2000 })
  public bio?: string;

  @prop({ ref: () => Media })
  public image?: Types.ObjectId;

  @prop({ ref: () => Station, index: true })
  public station?: Types.ObjectId;

  @prop({ type: () => Object, allowMixed: Severity.ALLOW })
  public socialLinks?: {
    facebook?: string;
    youtube?: string;
    twitter?: string;
    instagram?: string;
    tiktok?: string;
  };

  @prop({ type: Boolean, default: true })
  public isActive!: boolean;

  @prop({ ref: () => Program, type: () => [Types.ObjectId], default: [] })
  public programs!: Types.ObjectId[];

  public createdAt!: Date;
  public updatedAt!: Date;

  // Instance method to add a program
  public async addProgram(programId: string | Types.ObjectId) {
    const id = typeof programId === "string" ? new Types.ObjectId(programId) : programId;
    if (!this.programs.includes(id)) {
      this.programs.push(id);
    }
    return await JockModel.findByIdAndUpdate(this._id, { $addToSet: { programs: id } }, { new: true });
  }

  // Instance method to remove a program
  public async removeProgram(programId: string | Types.ObjectId) {
    const id = typeof programId === "string" ? new Types.ObjectId(programId) : programId;
    return await JockModel.findByIdAndUpdate(this._id, { $pull: { programs: id } }, { new: true });
  }

  // Instance method to get program count
  public getProgramCount(): number {
    return this.programs.length;
  }

  // Static method to find jocks with programs
  public static findWithPrograms() {
    return JockModel.find({
      programs: { $exists: true, $not: { $size: 0 } },
      isActive: true,
    }).populate("programs image");
  }

  // Static method to get jock statistics
  public static async getJockStats() {
    const stats = await JockModel.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalJocks: { $sum: 1 },
          avgProgramsPerJock: { $avg: { $size: "$programs" } },
          jocksWithPrograms: {
            $sum: {
              $cond: [{ $gt: [{ $size: "$programs" }, 0] }, 1, 0],
            },
          },
        },
      },
    ]);

    return (
      stats[0] || {
        totalJocks: 0,
        avgProgramsPerJock: 0,
        jocksWithPrograms: 0,
      }
    );
  }

  // Static method to search jocks
  public static searchJocks(query: string) {
    const searchRegex = new RegExp(query, "i");
    return JockModel.find({
      $or: [{ name: searchRegex }, { bio: searchRegex }],
      isActive: true,
    }).populate("programs image");
  }

  // Static method to get top jocks by program count
  public static getTopJocksByPrograms(limit = 10) {
    return JockModel.aggregate([
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

export const JockModel = getModelForClass(Jock);
