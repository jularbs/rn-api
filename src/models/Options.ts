import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { User } from "./User";
import { Media } from "./Media";

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

@modelOptions({
  schemaOptions: {
    timestamps: true,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
})
export class Options {
  @prop({ type: String, required: true, unique: true, trim: true, index: true, maxlength: 200 })
  public key!: string;

  @prop({ type: String, required: true, trim: true })
  public value!: string;

  @prop({ required: true, ref: () => User })
  public updatedBy!: Types.ObjectId;

  @prop({ ref: () => Media })
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

  // Static method to delete option by key
  public static deleteByKey(key: string) {
    return OptionsModel.findOneAndDelete({ key });
  }
}

export const OptionsModel = getModelForClass(Options);
