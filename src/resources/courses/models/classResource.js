import mongoose from "mongoose";

const classResourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'classType',
      required: true
    },
    classType: {
      type: String,
      enum: ["PrerecordedClass", "LiveClass"],
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    file: {
      url: {
        type: String,
        required: true
      },
      publicId: {
        type: String,
        required: true
      },
      originalName: {
        type: String,
        required: true
      },
      size: {
        type: Number // in bytes
      },
      format: {
        type: String
      },
      mimeType: {
        type: String
      }
    },
    type: {
      type: String,
      enum: [
        "document", // PDF, Word, PPT
        "image", // Images, diagrams
        "archive", // ZIP, RAR
        "code", // Source code files
        "audio", // Audio files
        "other"
      ],
      required: true
    },
    category: {
      type: String,
      enum: [
        "lecture_notes",
        "assignment",
        "reading_material",
        "code_samples",
        "presentation",
        "worksheet",
        "reference",
        "other"
      ],
      default: "other"
    },
    accessLevel: {
      type: String,
      enum: ["free", "premium", "enrolled_only"],
      default: "enrolled_only"
    },
    downloadCount: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    tags: [{
      type: String
    }]
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes for efficient queries
classResourceSchema.index({ courseId: 1, classId: 1 });
classResourceSchema.index({ classType: 1, classId: 1 });
classResourceSchema.index({ uploadedBy: 1 });
classResourceSchema.index({ type: 1, category: 1 });

export default mongoose.model("ClassResource", classResourceSchema);
