import { prop, getModelForClass, modelOptions, Severity, index } from '@typegoose/typegoose';
import { Types } from 'mongoose';

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
    collection: 'options'
  },
  options: {
    allowMixed: Severity.ALLOW
  }
})
export class Options implements IOptions {
  public _id!: Types.ObjectId;

  @prop({ required: true, unique: true, trim: true, maxlength: 100 })
  public key!: string;

  @prop({ required: true, trim: true, maxlength: 5000 })
  public value!: string;

  @prop({ required: true, ref: 'User' })
  public updatedBy!: Types.ObjectId;

  @prop({ ref: 'Media' })
  public media?: Types.ObjectId;

  @prop({ default: Date.now })
  public createdAt!: Date;

  @prop({ default: Date.now })
  public updatedAt!: Date;

  // Static method to get option by key
  public static getByKey(key: string) {
    return OptionsModel.findOne({ key }).populate('updatedBy media');
  }

  // Static method to set option value
  public static async setOption(key: string, value: string, updatedBy: string | Types.ObjectId, media?: string | Types.ObjectId) {
    const updateData: Record<string, unknown> = {
      value,
      updatedBy: typeof updatedBy === 'string' ? new Types.ObjectId(updatedBy) : updatedBy,
      updatedAt: new Date()
    };

    if (media) {
      updateData.media = typeof media === 'string' ? new Types.ObjectId(media) : media;
    }

    return OptionsModel.findOneAndUpdate(
      { key },
      updateData,
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    ).populate('updatedBy media');
  }

  // Static method to get multiple options by keys
  public static getByKeys(keys: string[]) {
    return OptionsModel.find({ key: { $in: keys } }).populate('updatedBy media');
  }

  // Static method to get all options
  public static getAllOptions() {
    return OptionsModel.find({}).sort({ key: 1 }).populate('updatedBy media');
  }

  // Static method to delete option by key
  public static deleteByKey(key: string) {
    return OptionsModel.findOneAndDelete({ key });
  }

  // Static method to search options
  public static searchOptions(query: string) {
    const searchRegex = new RegExp(query, 'i');
    return OptionsModel.find({
      $or: [
        { key: searchRegex },
        { value: searchRegex }
      ]
    }).populate('updatedBy media');
  }

  // Static method to get options by updater
  public static getByUpdater(updatedBy: string | Types.ObjectId) {
    const userId = typeof updatedBy === 'string' ? new Types.ObjectId(updatedBy) : updatedBy;
    return OptionsModel.find({ updatedBy: userId })
      .sort({ updatedAt: -1 })
      .populate('updatedBy media');
  }

  // Static method to get recently updated options
  public static getRecentlyUpdated(limit = 10) {
    return OptionsModel.find({})
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate('updatedBy media');
  }

  // Static method to get options with media
  public static getOptionsWithMedia() {
    return OptionsModel.find({ 
      media: { $exists: true, $ne: null } 
    }).populate('updatedBy media');
  }

  // Static method to get options statistics
  public static async getOptionsStats() {
    const stats = await OptionsModel.aggregate([
      {
        $group: {
          _id: null,
          totalOptions: { $sum: 1 },
          optionsWithMedia: {
            $sum: {
              $cond: [
                { $ne: ['$media', null] },
                1,
                0
              ]
            }
          },
          uniqueUpdaters: { $addToSet: '$updatedBy' }
        }
      },
      {
        $addFields: {
          uniqueUpdatersCount: { $size: '$uniqueUpdaters' }
        }
      },
      {
        $project: {
          totalOptions: 1,
          optionsWithMedia: 1,
          uniqueUpdatersCount: 1
        }
      }
    ]);

    return stats[0] || {
      totalOptions: 0,
      optionsWithMedia: 0,
      uniqueUpdatersCount: 0
    };
  }

  // Static method to bulk update options
  public static async bulkUpdateOptions(updates: Array<{ key: string; value: string; updatedBy: string | Types.ObjectId; media?: string | Types.ObjectId }>) {
    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: { key: update.key },
        update: {
          $set: {
            value: update.value,
            updatedBy: typeof update.updatedBy === 'string' ? new Types.ObjectId(update.updatedBy) : update.updatedBy,
            media: update.media ? (typeof update.media === 'string' ? new Types.ObjectId(update.media) : update.media) : undefined,
            updatedAt: new Date()
          }
        },
        upsert: true
      }
    }));

    return OptionsModel.bulkWrite(bulkOps);
  }
}

export const OptionsModel = getModelForClass(Options);
