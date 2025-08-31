import {
  prop,
  getModelForClass,
  modelOptions,
  index,
  DocumentType,
  pre,
} from "@typegoose/typegoose";
import { Types } from "mongoose";
import slugify from "slugify";
import validator from "validator";

export interface IStation {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  frequency: string;
  address?: string;
  locationGroup: "luzon" | "visayas" | "mindanao";
  logoImage?: Types.ObjectId;
  contactNumber?: string;
  email?: string;
  mapEmbedCode?: string;
  audioStreamURL?: string;
  videoStreamURL?: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

// Pre-hook to generate slug from name if not provided
@pre<Station>("save", function (this: DocumentType<Station>) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
  }
})

@index({ locationGroup: 1 })
@index({ status: 1 })
@index({ createdAt: -1 })
@index({ deletedAt: -1 })
@modelOptions({
  schemaOptions: {
    timestamps: true,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
})
export class Station {
  @prop({
    required: true,
    trim: true,
    maxlength: [100, "Station name cannot exceed 100 characters"],
  })
  public name!: string;

  @prop({
    unique: true,
    lowercase: true,
    require: true,
  })
  public slug!: string;

  @prop({
    required: true,
    trim: true,
    maxlength: [10, "Frequency cannot exceed 10 characters"],
  })
  public frequency!: string;

  @prop({
    trim: true,
    maxlength: [200, "Address cannot exceed 200 characters"],
  })
  public address?: string;

  @prop({
    required: true,
    enum: {
      values: ["luzon", "visayas", "mindanao"],
      message: "'{VALUE}' is not a valid location group.",
    },
  })
  public locationGroup!: "luzon" | "visayas" | "mindanao";

  @prop({ ref: 'Media' })
  public logoImage?: Types.ObjectId;

  @prop({
    trim: true,
    maxlength: [100, "Contact number cannot exceed 100 characters"],
  })
  public contactNumber?: string;

  @prop({
    trim: true,
    lowercase: true,
    validate: [
      validator.isEmail,
      "Please provide a valid email address",
    ],
  })
  public email?: string;

  @prop({
    trim: true,
  })
  public mapEmbedCode?: string;

  @prop({
    trim: true,
    validate: [
      validator.isURL,
      "Please provide a valid URL for the audio stream",
    ],
  })
  public audioStreamURL?: string;

  @prop({
    trim: true,
    validate: [
      validator.isURL,
      "Please provide a valid URL for the video stream",
    ],
  })
  public videoStreamURL?: string;

  @prop({
    required: true,
    enum: {
      values: ["active", "inactive"],
      message: "'{VALUE}' is not a valid status.",
    },
    default: "active",
  })
  public status!: "active" | "inactive";

  public createdAt!: Date;
  public updatedAt!: Date;
}

export const StationModel = getModelForClass(Station);
