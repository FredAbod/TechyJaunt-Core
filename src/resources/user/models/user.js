import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
    },
    profilePic: {
      type: String,
    },
    profilePicPublicId: {
      type: String, // Store Cloudinary public_id for deletion
    },
    phone: {
      type: String,
    },
    dateOfBirth: {
      type: Date,
    },
    placeOfBirth: {
      type: String,
    },
    course: {
      type: String,
    },
    courseDuration: {
      type: String,
    },
    socialMedia: {
      facebook: { type: String },
      twitter: { type: String },
      linkedin: { type: String },
      instagram: { type: String },
      other: { type: String },
    },
    deliveryAddress: {
      address: { type: String },
      city: { type: String },
      country: { type: String },
      zipCode: { type: String },
    },
    emailOtp: {
      type: String,
    },
    otpExpiresAt: {
      type: Date,
    },
    resetOTP: {
      type: String,
    },
    resetOtpExpiresAt: {
      type: Date,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["super admin", "admin", "tutor", "user"],
      default: "user",
    },
    status: {
      type: String,
      enum: ["pending", "active", "inactive", "suspended"],
      default: "pending",
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.emailOtp;
  delete user.resetOTP;
  delete user.otpExpiresAt;
  delete user.resetOtpExpiresAt;
  return user;
};

export default mongoose.model("User", userSchema);