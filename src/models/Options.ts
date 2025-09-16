import { prop, getModelForClass, modelOptions, index } from "@typegoose/typegoose";
import { Types } from "mongoose";

// Interface for Options
export interface IOptions {
  _id: Types.ObjectId;
  key: string;
  value: string;
  updatedBy: Types.ObjectId;
  media?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

@index({ key: 1 }, { unique: true })
@index({ updatedBy: 1 })
@index({ createdAt: -1 })
@modelOptions({
  schemaOptions: {
    timestamps: true,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
})
export class Options {
  @prop({ required: true, unique: true, trim: true, maxlength: 200 })
  public key!: string;

  @prop({ required: true, trim: true })
  public value!: string;

  @prop({ required: true, ref: "User" })
  public updatedBy!: Types.ObjectId;

  @prop({ ref: "Media" })
  public media?: Types.ObjectId;

  public createdAt!: Date;
  public updatedAt!: Date;

  // Static method to get option by key
  public static getByKey(key: string) {
    return OptionsModel.findOne({ key }).populate("updatedBy media");
  }

  // Static method to set option value
  public static async setOption(
    key: string,
    value: string,
    updatedBy: string | Types.ObjectId,
    media?: string | Types.ObjectId
  ) {
    const updateData: Record<string, unknown> = {
      value,
      updatedBy: typeof updatedBy === "string" ? new Types.ObjectId(updatedBy) : updatedBy,
    };

    if (media) {
      updateData.media = typeof media === "string" ? new Types.ObjectId(media) : media;
    }

    return OptionsModel.findOneAndUpdate({ key }, updateData, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }).populate("updatedBy media");
  }

  // Static method to get multiple options by keys
  public static getByKeys(keys: string[]) {
    return OptionsModel.find({ key: { $in: keys } }).populate("updatedBy media");
  }

  // Static method to get all options
  public static getAllOptions() {
    return OptionsModel.find({}).sort({ key: 1 }).populate("updatedBy media");
  }

  // Static method to delete option by key
  public static deleteByKey(key: string) {
    return OptionsModel.findOneAndDelete({ key });
  }

  // Static method to search options
  public static searchOptions(query: string) {
    const searchRegex = new RegExp(query, "i");
    return OptionsModel.find({
      $or: [{ key: searchRegex }, { value: searchRegex }],
    }).populate("updatedBy media");
  }
  
  // Static method to bulk update options
  public static async bulkUpdateOptions(
    updates: Array<{ key: string; value: string; updatedBy: string | Types.ObjectId; media?: string | Types.ObjectId }>
  ) {
    const bulkOps = updates.map((update) => ({
      updateOne: {
        filter: { key: update.key },
        update: {
          $set: {
            value: update.value,
            updatedBy: typeof update.updatedBy === "string" ? new Types.ObjectId(update.updatedBy) : update.updatedBy,
            media: update.media
              ? typeof update.media === "string"
                ? new Types.ObjectId(update.media)
                : update.media
              : undefined,
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    return OptionsModel.bulkWrite(bulkOps);
  }
}

export const OptionsModel = getModelForClass(Options);
