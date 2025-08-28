const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
        select: false // Don't include password in query results by default
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user'
    },
    deletedAt: {
        type: Date,
        default: null
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    lastLogin: {
        type: Date,
        default: null
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: {
        type: String,
        select: false
    },
    passwordResetToken: {
        type: String,
        select: false
    },
    passwordResetExpires: {
        type: Date,
        select: false
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Index for faster queries
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ deletedAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();

    try {
        // Hash password with cost of 12
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Pre-save middleware to set email verification token
userSchema.pre('save', function (next) {
    if (this.isNew && !this.emailVerified) {
        this.emailVerificationToken = require('crypto').randomBytes(32).toString('hex');
    }
    next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate password reset token
userSchema.methods.createPasswordResetToken = function () {
    const resetToken = require('crypto').randomBytes(32).toString('hex');

    this.passwordResetToken = require('crypto')
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    return resetToken;
};

// Instance method for soft delete
userSchema.methods.softDelete = function (deletedBy = null) {
    this.deletedAt = new Date();
    if (deletedBy) {
        this.deletedBy = deletedBy;
    }
    return this.save();
};

// Instance method to restore soft deleted user
userSchema.methods.restore = function () {
    this.deletedAt = null;
    this.deletedBy = null;
    return this.save();
};

// Instance method to check if user is soft deleted
userSchema.methods.isDeletedUser = function () {
    return this.deletedAt !== null;
};

// Static method to find deleted users
userSchema.statics.findDeleted = function () {
    return this.find({ deletedAt: { $ne: null } });
};

// Static method to find with deleted users included
userSchema.statics.findWithDeleted = function () {
    return this.find({});
};

// Static method to restore user by ID
userSchema.statics.restoreById = function (id) {
    return this.findByIdAndUpdate(
        id,
        {
            deletedAt: null,
            deletedBy: null
        },
        { new: true }
    );
};

// Static method to permanently delete user
userSchema.statics.forceDelete = function (id) {
    return this.findByIdAndDelete(id);
};

// Query middleware to exclude soft deleted users by default
userSchema.pre(/^find/, function () {
    this.where({ deletedAt: null });
});

userSchema.pre('countDocuments', function () {
    this.where({ deletedAt: null });
});

const User = mongoose.model('User', userSchema);

module.exports = User;
