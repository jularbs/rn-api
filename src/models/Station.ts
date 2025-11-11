import { prop, getModelForClass, modelOptions, index, DocumentType, pre } from "@typegoose/typegoose";
import { Types } from "mongoose";
import slugify from "slugify";
import validator from "validator";
import { Media } from "./Media";

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
  default: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Pre-hook to generate slug from name if not provided
@pre<Station>("save", function (this: DocumentType<Station>) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
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
    type: String,
    required: true,
    trim: true,
    maxlength: [100, "Station name cannot exceed 100 characters"],
  })
  public name!: string;

  @prop({
    type: String,
    unique: true,
    lowercase: true,
    require: true,
  })
  public slug!: string;

  @prop({
    type: String,
    required: true,
    trim: true,
    maxlength: [10, "Frequency cannot exceed 10 characters"],
  })
  public frequency!: string;

  @prop({
    type: String,
    trim: true,
    maxlength: [200, "Address cannot exceed 200 characters"],
  })
  public address?: string;

  @prop({
    type: String,
    required: true,
    enum: {
      values: ["luzon", "visayas", "mindanao"],
      message: "'{VALUE}' is not a valid location group.",
    },
  })
  public locationGroup!: "luzon" | "visayas" | "mindanao";

  @prop({ ref: () => Media })
  public logoImage?: Types.ObjectId;

  @prop({
    type: String,
    trim: true,
    maxlength: [100, "Contact number cannot exceed 100 characters"],
  })
  public contactNumber?: string;

  @prop({
    type: String,
    trim: true,
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email address"],
  })
  public email?: string;

  @prop({
    type: String,
    trim: true,
  })
  public mapEmbedCode?: string;

  @prop({
    type: String,
    trim: true,
    validate: [validator.isURL, "Please provide a valid URL for the audio stream"],
  })
  public audioStreamURL?: string;

  @prop({
    type: String,
    trim: true,
    validate: [validator.isURL, "Please provide a valid URL for the video stream"],
  })
  public videoStreamURL?: string;

  @prop({
    type: String,
    required: true,
    enum: {
      values: ["active", "inactive"],
      message: "'{VALUE}' is not a valid status.",
    },
    default: "active",
  })
  public status!: "active" | "inactive";

  @prop({
    type: Boolean,
    required: true,
    default: false,
  })
  public default!: boolean;

  public createdAt!: Date;
  public updatedAt!: Date;

  // Static method to find all stations
  public static findAll() {
    return StationModel.find();
  }

  // Static method to find active stations
  public static findActive() {
    return StationModel.find({ status: "active" });
  }

  // Static method to find inactive stations
  public static findInactive() {
    return StationModel.find({ status: "inactive" });
  }

  // Static method to find by slug
  public static findBySlug(slug: string) {
    return StationModel.findOne({ slug });
  }

  // Static method to find by location group
  public static findByLocationGroup(locationGroup: "luzon" | "visayas" | "mindanao") {
    return StationModel.find({ locationGroup, status: "active" }).sort({ name: 1 });
  }

  // Static method to search stations by name or frequency
  public static search(query: string) {
    return StationModel.find({
      $or: [{ name: { $regex: query, $options: "i" } }, { frequency: { $regex: query, $options: "i" } }],
      status: "active",
    });
  }

  // Static method to find stations with streaming URLs
  public static findWithAudioStream() {
    return StationModel.find({
      audioStreamURL: { $exists: true, $nin: [null, ""] },
      status: "active",
    });
  }

  // Static method to find stations with video streaming URLs
  public static findWithVideoStream() {
    return StationModel.find({
      videoStreamURL: { $exists: true, $nin: [null, ""] },
      status: "active",
    });
  }

  // Static method to find stations with both audio and video streams
  public static findWithBothStreams() {
    return StationModel.find({
      audioStreamURL: { $exists: true, $nin: [null, ""] },
      videoStreamURL: { $exists: true, $nin: [null, ""] },
      status: "active",
    });
  }

  // Static method to find stations with logos
  public static findWithLogos() {
    return StationModel.find({
      logoImage: { $exists: true, $ne: null },
      status: "active",
    }).populate("logoImage");
  }

  // Static method to get station statistics
  public static async getStationStats() {
    const stats = await StationModel.aggregate([
      {
        $group: {
          _id: null,
          totalStations: { $sum: 1 },
          activeStations: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          inactiveStations: {
            $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] },
          },
          stationsWithAudio: {
            $sum: {
              $cond: [
                {
                  $and: [{ $ne: ["$audioStreamURL", null] }, { $ne: ["$audioStreamURL", ""] }],
                },
                1,
                0,
              ],
            },
          },
          stationsWithVideo: {
            $sum: {
              $cond: [
                {
                  $and: [{ $ne: ["$videoStreamURL", null] }, { $ne: ["$videoStreamURL", ""] }],
                },
                1,
                0,
              ],
            },
          },
          stationsWithLogos: {
            $sum: {
              $cond: [{ $ne: ["$logoImage", null] }, 1, 0],
            },
          },
        },
      },
    ]);

    return (
      stats[0] || {
        totalStations: 0,
        activeStations: 0,
        inactiveStations: 0,
        stationsWithAudio: 0,
        stationsWithVideo: 0,
        stationsWithLogos: 0,
      }
    );
  }

  // Static method to get stations by location group statistics
  public static async getLocationGroupStats() {
    return StationModel.aggregate([
      {
        $group: {
          _id: "$locationGroup",
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          inactive: {
            $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  // Static method to activate a station
  public static async activateStation(stationId: string | Types.ObjectId) {
    return StationModel.findByIdAndUpdate(stationId, { status: "active" }, { new: true });
  }

  // Static method to deactivate a station
  public static async deactivateStation(stationId: string | Types.ObjectId) {
    return StationModel.findByIdAndUpdate(stationId, { status: "inactive" }, { new: true });
  }

  // Static method to set a station as default and unset all others
  public static async setDefaultStation(stationId: string | Types.ObjectId) {
    await StationModel.updateMany({}, { default: false });    
    return StationModel.findByIdAndUpdate(stationId, { default: true }, { new: true });
  }

    // Static method to find stations with logos
  public static async getDefaultStation() {
    return StationModel.findOne({
      default: true,
    }).populate("logoImage", "key bucket url mimeType");
  }

  // Static method to bulk update stations status
  public static async bulkUpdateStatus(stationIds: (string | Types.ObjectId)[], status: "active" | "inactive") {
    return StationModel.updateMany({ _id: { $in: stationIds } }, { status });
  }

  // Static method to find stations missing required streaming info
  public static findMissingStreamInfo() {
    return StationModel.find({
      $or: [{ audioStreamURL: { $in: [null, ""] } }, { videoStreamURL: { $in: [null, ""] } }],
      status: "active",
    });
  }
}

export const StationModel = getModelForClass(Station);
