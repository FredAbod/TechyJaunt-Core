import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
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
    type: {
      type: String,
      enum: ["video", "text", "quiz", "assignment", "live"],
      required: true,
    },
    content: {
      // For video lessons
      videoUrl: {
        type: String,
      },
      videoDuration: {
        type: Number, // in seconds
      },
      // For text lessons
      textContent: {
        type: String,
      },
      // For assignments
      assignmentInstructions: {
        type: String,
      },
      // For quizzes
      quizData: {
        type: mongoose.Schema.Types.Mixed,
      },
    },
    resources: [{
      title: {
        type: String,
        required: true,
      },
      fileUrl: {
        type: String,
        required: true,
      },      fileType: {
        type: String,
        enum: ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "zip", "txt", "csv", "ipynb", "py", "js", "html", "css", "json", "other"],
        required: true,
      },
      fileSize: {
        type: Number, // in bytes
      },
    }],
    isFree: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    prerequisites: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
    }],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Ensure unique order per module
lessonSchema.index({ moduleId: 1, order: 1 }, { unique: true });

export default mongoose.model("Lesson", lessonSchema);
