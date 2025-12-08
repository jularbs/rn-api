import { prop, pre, index, modelOptions, getModelForClass, DocumentType } from "@typegoose/typegoose";
import { Types } from "mongoose";
import validator from "validator";

export interface IRecepient {
  _id: Types.ObjectId;
  reason: string;
  email?: string;
  isActive: boolean;
  description?: string;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  softDelete(deletedBy?: Types.ObjectId): Promise<DocumentType<Recepient>>;
  restore(): Promise<DocumentType<Recepient>>;
  isDeleted(): boolean;
}

/* eslint-disable-next-line */
@pre<Recepient>(/^find/, function (this: any) {
  // Skip filtering if includeDeleted option is set
  if (this.getOptions().includeDeleted) {
    return;
  }
  // Automatically filter out soft-deleted recipients for all find operations
  this.where({ deletedAt: null });
})
/* eslint-disable-next-line */
@pre<Recepient>("countDocuments", function (this: any) {
  // Automatically filter out soft-deleted recipients for count operations
  this.where({ deletedAt: null });
})
@index({ reason: 1 })
@index({ email: 1 })
@index({ isActive: 1 })
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
export class Recepient implements IRecepient {
  _id!: Types.ObjectId;

  @prop({
    required: [true, "Reason is required"],
    trim: true,
    minlength: [3, "Reason must be at least 3 characters long"],
    maxlength: [100, "Reason cannot exceed 100 characters"],
    unique: true,
  })
  reason!: string;

  @prop({
    required: false,
    trim: true,
    lowercase: true,
    validate: {
      validator: (value: string) => {
        // Skip validation if empty
        if (!value || value.trim() === '') return true;
        // Split by comma and validate each email
        const emails = value.split(',').map(email => email.trim());
        return emails.every(email => validator.isEmail(email));
      },
      message: "Please provide valid email address(es). Multiple emails should be separated by commas",
    },
  })
  email?: string;

  @prop({
    required: true,
    default: true,
  })
  isActive!: boolean;

  @prop({
    trim: true,
    maxlength: [500, "Description cannot exceed 500 characters"],
  })
  description?: string;

  @prop({ default: null })
  deletedAt?: Date;

  @prop({ type: () => Types.ObjectId, ref: "User", default: null })
  deletedBy?: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;

  // Instance method to soft delete a recipient
  public async softDelete(this: DocumentType<Recepient>, deletedBy?: Types.ObjectId): Promise<DocumentType<Recepient>> {
    this.deletedAt = new Date();
    if (deletedBy) {
      this.deletedBy = deletedBy;
    }
    return await this.save();
  }

  // Instance method to restore a soft-deleted recipient
  public async restore(this: DocumentType<Recepient>): Promise<DocumentType<Recepient>> {
    this.deletedAt = undefined;
    this.deletedBy = undefined;
    return await this.save();
  }

  // Instance method to check if recipient is deleted
  public isDeleted(this: DocumentType<Recepient>): boolean {
    return this.deletedAt !== null && this.deletedAt !== undefined;
  }
}

export const RecepientModel = getModelForClass(Recepient);
