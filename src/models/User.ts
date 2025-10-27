import {
  prop,
  pre,
  index,
  modelOptions,
  getModelForClass,
  DocumentType,
} from "@typegoose/typegoose";
import { Types } from "mongoose";
import * as bcrypt from "bcryptjs";
import { randomBytes, createHash } from "crypto";
import validator from "validator";

export interface IUser {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  password?: string;
  role: "admin" | "manager" | "managing-editor" | "digital-content-producer";
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  lastLogin?: Date;
  accountVerified: boolean;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  createPasswordResetToken(): string;
  softDelete(deletedBy?: Types.ObjectId): Promise<DocumentType<User>>;
  restore(): Promise<DocumentType<User>>;
  isDeletedUser(): boolean;
}

@pre<User>("save", async function (this: DocumentType<User>) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
})
@pre<User>("save", function (this: DocumentType<User>) {
  if (this.isNew && !this.emailVerified) {
    this.emailVerificationToken = randomBytes(32).toString("hex");
  }
})
/* eslint-disable-next-line */
@pre<User>(/^find/, function (this: any) {
  // Automatically filter out soft-deleted users for all find operations
  this.where({ deletedAt: null });
})
/* eslint-disable-next-line */
@pre<User>("countDocuments", function (this: any) {
  // Automatically filter out soft-deleted users for count operations
  this.where({ deletedAt: null });
})
@index({ role: 1 })
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
export class User {
  @prop({
    type: String,
    required: [true, "Full name is required"],
    trim: true,
    maxlength: [100, "Full name cannot exceed 100 characters"],
  })
  public fullName!: string;

  @prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email address"],
  })
  public email!: string;

  @prop({
    type: String,
    required: true,
    minlength: [6, "Password must be at least 6 characters long"],
    select: false,
  })
  public password!: string;

  @prop({
    type: String,
    enum: ["admin", "manager", "managing-editor", "digital-content-producer"],
    default: "digital-content-producer",
  })
  public role!: "admin" | "manager" | "managing-editor" | "digital-content-producer";

  @prop({ type: Date, default: null })
  public deletedAt?: Date;

  @prop({ ref: () => User, default: null })
  public deletedBy?: Types.ObjectId;

  @prop({ type: Date, default: null })
  public lastLogin?: Date;

  @prop({ type: Boolean, default: false })
  public accountVerified!: boolean;

  @prop({ type: Boolean, default: false })
  public emailVerified!: boolean;

  @prop({ type: String, select: false })
  public emailVerificationToken?: string;

  @prop({ type: String, select: false })
  public passwordResetToken?: string;

  @prop({ type: Date, select: false })
  public passwordResetExpires?: Date;

  public createdAt!: Date;
  public updatedAt!: Date;

  // Instance method to check password
  public async comparePassword(this: DocumentType<User>, candidatePassword: string): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  // Instance method to generate password reset token
  public createPasswordResetToken(this: DocumentType<User>): string {
    const resetToken = randomBytes(32).toString("hex");

    this.passwordResetToken = createHash("sha256").update(resetToken).digest("hex");

    this.passwordResetExpires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    return resetToken;
  }

  // Instance method for soft delete
  public async softDelete(this: DocumentType<User>, deletedBy?: Types.ObjectId): Promise<DocumentType<User>> {
    this.deletedAt = new Date();
    if (deletedBy) {
      this.deletedBy = deletedBy;
    }
    return await this.save();
  }

  // Instance method to restore soft deleted user
  public async restore(this: DocumentType<User>): Promise<DocumentType<User>> {
    this.deletedAt = undefined;
    this.deletedBy = undefined;
    return await this.save();
  }

  // Instance method to check if user is soft deleted
  public isDeletedUser(this: DocumentType<User>): boolean {
    return this.deletedAt !== null && this.deletedAt !== undefined;
  }

  // Static method to find deleted users
  public static findDeleted() {
    return UserModel.find({ deletedAt: { $ne: null } });
  }

  // Static method to find with deleted users included
  public static findWithDeleted() {
    return UserModel.find({});
  }

  // Static method to restore user by ID
  public static restoreById(id: string | Types.ObjectId) {
    return UserModel.findByIdAndUpdate(
      id,
      {
        deletedAt: null,
        deletedBy: null,
      },
      { new: true }
    );
  }

  // Static method to permanently delete user
  public static forceDelete(id: string | Types.ObjectId) {
    return UserModel.findByIdAndDelete(id);
  }
}

export const UserModel = getModelForClass(User);
