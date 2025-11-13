import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true
    },
    certificateNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    issueDate: {
      type: Date,
      default: Date.now,
      required: true
    },
    completionDate: {
      type: Date,
      required: true
    },
    // Student info at time of certification
    studentName: {
      type: String,
      required: true
    },
    studentEmail: {
      type: String,
      required: true
    },
    // Course info at time of certification
    courseTitle: {
      type: String,
      required: true
    },
    courseCategory: {
      type: String,
      required: true
    },
    courseLevel: {
      type: String,
      required: true
    },
    courseDuration: {
      type: String
    },
    // Progress/performance data
    finalScore: {
      type: Number,
      min: 0,
      max: 100
    },
    totalModules: {
      type: Number,
      required: true
    },
    totalLessons: {
      type: Number,
      required: true
    },
    totalWatchTime: {
      type: Number, // in seconds
      default: 0
    },
    // Certificate status
    status: {
      type: String,
      enum: ["active", "revoked", "expired"],
      default: "active"
    },
    revokedAt: {
      type: Date
    },
    revokedReason: {
      type: String
    },
    // Certificate file
    certificateUrl: {
      type: String // URL to generated certificate PDF/image
    },
    certificatePublicId: {
      type: String // Cloudinary public ID for deletion
    },
    // Verification
    verificationCode: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    isVerified: {
      type: Boolean,
      default: true
    },
    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound index for user-course uniqueness
certificateSchema.index({ userId: 1, courseId: 1 }, { unique: true });

// Virtual for certificate age
certificateSchema.virtual('certificateAge').get(function() {
  const now = new Date();
  const issued = new Date(this.issueDate);
  const diffTime = Math.abs(now - issued);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Method to check if certificate is valid
certificateSchema.methods.isValid = function() {
  return this.status === 'active' && this.isVerified;
};

// Method to revoke certificate
certificateSchema.methods.revoke = function(reason) {
  this.status = 'revoked';
  this.revokedAt = new Date();
  this.revokedReason = reason;
  return this.save();
};

const Certificate = mongoose.model("Certificate", certificateSchema);

export default Certificate;
