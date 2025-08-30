import { prop, getModelForClass } from "@typegoose/typegoose";
import { Types } from "mongoose";

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
    enum: ["luzon", "visayas", "mindanao"],
  })
  public locationGroup!: "luzon" | "visayas" | "mindanao";

  @prop({
    trim: true,
  })
  public audioStreamURL?: string;

  @prop({
    trim: true,
  })
  public videoStreamURL?: string;

  @prop({
    required: true,
    enum: ["active", "inactive"],
    default: "active",
  })
  public status!: "active" | "inactive";

  public createdAt!: Date;
  public updatedAt!: Date;
}

export const StationModel = getModelForClass(Station);
