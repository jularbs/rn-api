import {
  prop,
  getModelForClass,
  modelOptions,
  index,
  pre,
  DocumentType
} from "@typegoose/typegoose";
import { Types } from "mongoose";

export interface IMedia {
  _id: Types.ObjectId;
  originalName: string;
  key: string;
  bucket: string;
  url?: string;
  mimeType: string;
  size: number;
  alt?: string;
  caption?: string;
  createdAt: Date;
  updatedAt: Date;

  // Virtual fields
  extension: string;
  isImage: boolean;
  isVideo: boolean;
  isAudio: boolean;
  isDocument: boolean;
}

// Pre-hook to extract extension from key if needed
@pre<Media>("save", function (this: DocumentType<Media>) {
  // Any pre-save logic can go here if needed
})

@index({ createdAt: -1 })
@modelOptions({
  schemaOptions: {
    timestamps: true,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
})
export class Media {
  @prop({
    required: true,
    trim: true,
    maxlength: [255, "Original name cannot exceed 255 characters"]
  })
  public originalName!: string;

  @prop({
    required: true,
    unique: true,
    trim: true,
    maxlength: [512, "S3 key cannot exceed 512 characters"],
    index: true
  })
  public key!: string;

  @prop({
    required: true,
    trim: true,
    maxlength: [63, "S3 bucket name cannot exceed 63 characters"],
    index: true
  })
  public bucket!: string;

  @prop({
    trim: true,
    maxlength: [1024, "URL cannot exceed 1024 characters"],
  })
  public url?: string;

  @prop({
    required: true,
    trim: true,
    maxlength: [127, "MIME type cannot exceed 127 characters"],
    index: true
  })
  public mimeType!: string;

  @prop({
    required: true,
    min: [0, "File size cannot be negative"]
  })
  public size!: number;

  @prop({
    trim: true,
    maxlength: [255, "Alt text cannot exceed 255 characters"],
  })
  public alt?: string;

  @prop({
    trim: true,
    maxlength: [500, "Caption cannot exceed 500 characters"],
  })
  public caption?: string;

  public createdAt!: Date;
  public updatedAt!: Date;

  // Virtual for file extension from key
  public get extension(): string {
    return this.key.split('.').pop()?.toLowerCase() || '';
  }

  // Virtual to check if file is an image
  public get isImage(): boolean {
    return this.mimeType.startsWith('image/');
  }

  // Virtual to check if file is a video
  public get isVideo(): boolean {
    return this.mimeType.startsWith('video/');
  }

  // Virtual to check if file is audio
  public get isAudio(): boolean {
    return this.mimeType.startsWith('audio/');
  }

  // Virtual to check if file is a document
  public get isDocument(): boolean {
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv'
    ];
    return documentTypes.includes(this.mimeType);
  }

  // Static method to find all media
  public static findAll() {
    return MediaModel.find();
  }

  // Static method to find by MIME type
  public static findByMimeType(mimeType: string) {
    return MediaModel.find({ mimeType });
  }

  // Static method to find images
  public static findImages() {
    return MediaModel.find({ 
      mimeType: { $regex: '^image/' }
    });
  }

  // Static method to find videos
  public static findVideos() {
    return MediaModel.find({ 
      mimeType: { $regex: '^video/' }
    });
  }

  // Static method to find audio files
  public static findAudio() {
    return MediaModel.find({ 
      mimeType: { $regex: '^audio/' }
    });
  }

  // Static method to find documents
  public static findDocuments() {
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv'
    ];
    return MediaModel.find({ 
      mimeType: { $in: documentTypes }
    });
  }

  // Static method to find by bucket
  public static findByBucket(bucket: string) {
    return MediaModel.find({ bucket });
  }

  // Static method to find by key
  public static findByKey(key: string) {
    return MediaModel.findOne({ key });
  }

  // Static method to search by alt text or caption
  public static search(query: string) {
    return MediaModel.find({
      $or: [
        { alt: { $regex: query, $options: 'i' } },
        { caption: { $regex: query, $options: 'i' } }
      ]
    });
  }

  // Static method to get basic statistics
  public static async getBasicStats() {
    const stats = await MediaModel.aggregate([
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 }
        }
      }
    ]);

    return stats[0] || {
      totalFiles: 0
    };
  }

  // Static method to get file type distribution
  public static async getFileTypeStats() {
    return MediaModel.aggregate([
      {
        $group: {
          _id: '$mimeType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
  }

  // Static method to get bucket statistics
  public static async getBucketStats() {
    return MediaModel.aggregate([
      {
        $group: {
          _id: '$bucket',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
  }
}

export const MediaModel = getModelForClass(Media);
