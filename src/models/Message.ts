import { prop, index, modelOptions, getModelForClass, DocumentType } from "@typegoose/typegoose";
import { Types } from "mongoose";
import validator from "validator";

export interface IMessage {
  _id: Types.ObjectId;
  stationId: Types.ObjectId;
  reason: string;
  fullName: string;
  emailAddress: string;
  contactNumber: string;
  excerpt: string;
  message: string;
  status: "unread" | "read" | "replied" | "archived";
  readAt?: Date;
  readBy?: Types.ObjectId;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  markAsRead(userId: Types.ObjectId): Promise<DocumentType<Message>>;
}

@index({ stationId: 1 })
@index({ status: 1 })
@index({ createdAt: -1 })
@index({ deletedAt: -1 })
@index({ emailAddress: 1 })
@modelOptions({
  schemaOptions: {
    timestamps: true,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
})
export class Message {
  @prop({
    ref: "Station",
    required: [true, "Station ID is required"],
    type: Types.ObjectId,
  })
  public stationId!: Types.ObjectId;

  @prop({
    type: String,
    required: [true, "Reason is required"],
    trim: true,
    maxlength: [100, "Reason cannot exceed 100 characters"],
  })
  public reason!: string;

  @prop({
    type: String,
    required: [true, "Full name is required"],
    trim: true,
    maxlength: [100, "Full name cannot exceed 100 characters"],
  })
  public fullName!: string;

  @prop({
    type: String,
    required: [true, "Email address is required"],
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email address"],
  })
  public emailAddress!: string;

  @prop({
    type: String,
    required: [true, "Contact number is required"],
    trim: true,
    maxlength: [20, "Contact number cannot exceed 20 characters"],
  })
  public contactNumber!: string;

  @prop({
    type: String,
    required: [true, "Message is required"],
    trim: true,
    maxlength: [2000, "Message cannot exceed 2000 characters"],
  })
  public message!: string;

  @prop({
    type: String,
    trim: true,
    maxlength: [180, "Excerpt cannot exceed 180 characters"],
  })
  public excerpt!: string;

  @prop({
    type: String,
    enum: ["unread", "read", "replied", "archived"],
    default: "unread",
  })
  public status!: "unread" | "read" | "replied" | "archived";

  @prop({ type: Date, default: null })
  public readAt?: Date;

  @prop({ ref: "User", default: null, type: Types.ObjectId })
  public readBy?: Types.ObjectId;

  @prop({ type: Date, default: null })
  public deletedAt?: Date;

  @prop({ ref: "User", default: null, type: Types.ObjectId })
  public deletedBy?: Types.ObjectId;

  // Instance method to mark message as read
  public async markAsRead(this: DocumentType<Message>, userId: Types.ObjectId): Promise<DocumentType<Message>> {
    this.status = "read";
    this.readAt = new Date();
    this.readBy = userId;
    return this.save();
  }

  public async markAsUnread(this: DocumentType<Message>): Promise<DocumentType<Message>> {
    this.status = "unread";
    this.readAt = undefined;
    this.readBy = undefined;
    return this.save();
  }
}

// Create and export the model
export const MessageModel = getModelForClass(Message);
