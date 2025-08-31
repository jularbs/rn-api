import {
  prop,
  getModelForClass,
  modelOptions,
  index,
} from "@typegoose/typegoose";
import { Types } from "mongoose";
import validator from "validator";

export interface IStation {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  frequency: string;
  address?: string;
  locationGroup: "luzon" | "visayas" | "mindanao";
  audioStreamURL?: string;
  videoStreamURL?: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

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
