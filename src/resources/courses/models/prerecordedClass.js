import mongoose from "mongoose";

const prerecordedClassSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module"
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    video: {
      url: {
        type: String,
        required: true
      },
      publicId: {
        type: String,
        required: true
      },
      duration: {
        type: Number // in seconds
      },
      size: {
        type: Number // in bytes
      },
      format: {
        type: String
      },
      quality: {
        type: String,
        enum: ["720p", "1080p", "auto"],
        default: "auto"
      }
    },
    thumbnail: {
      url: {
        type: String
      },
      publicId: {
        type: String
      }
    },
    transcript: {
      type: String // Auto-generated or manual transcript
    },
    captions: [{
      language: {
        type: String,
        default: "en"
      },
      url: {
        type: String
      },
      isDefault: {
        type: Boolean,
        default: false
      }
    }],
    tags: [{
      type: String
    }],
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"]
    },
    order: {
      type: Number,
      default: 0
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    publishedAt: {
      type: Date
    },
    viewCount: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalRatings: {
      type: Number,
      default: 0
    },
    watchTime: {
      totalMinutes: {
        type: Number,
        default: 0
      },
      averageWatchTime: {
        type: Number,
        default: 0
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    uploadProgress: {
      type: Number,
      default: 100 // Percentage
    },
    processingStatus: {
      type: String,
      enum: ["uploading", "processing", "ready", "failed"],
      default: "ready"
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes for efficient queries
prerecordedClassSchema.index({ courseId: 1, order: 1 });
prerecordedClassSchema.index({ instructor: 1 });
prerecordedClassSchema.index({ isPublished: 1, isActive: 1 });
prerecordedClassSchema.index({ title: "text", description: "text", tags: "text" });

export default mongoose.model("PrerecordedClass", prerecordedClassSchema);
