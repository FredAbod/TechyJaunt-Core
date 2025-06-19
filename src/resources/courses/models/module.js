import mongoose from "mongoose";

const moduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    order: {
      type: Number,
      required: true,
    },
    lessons: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
    }],
    duration: {
      type: String, // e.g., "2 hours", "45 minutes"
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Ensure unique order per course
moduleSchema.index({ courseId: 1, order: 1 }, { unique: true });

export default mongoose.model("Module", moduleSchema);
