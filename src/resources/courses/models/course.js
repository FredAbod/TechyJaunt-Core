import mongoose from "mongoose";
import {
  COURSE_CODE_PATTERN,
  COURSE_CODE_HINT,
  normalizeCourseCode,
} from "../../../utils/helper/courseCode.js";

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // Optional short code admins use to reference the course (e.g. in CSV imports)
    code: {
      type: String,
      set: (value) => normalizeCourseCode(value) || undefined,
      match: [COURSE_CODE_PATTERN, `Course code must be ${COURSE_CODE_HINT}`],
    },
    description: {
      type: String,
      required: true,
    },
    shortDescription: {
      type: String,
      required: true,
      maxlength: 200,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Web Development",
        "Mobile Development", 
        "Data Science",
        "AI/Machine Learning",
        "DevOps",
        "Cybersecurity",
        "UI/UX Design",
        "Digital Marketing",
        "Other"
      ],
    },
    level: {
      type: String,
      required: true,
      enum: ["Beginner", "Intermediate", "Advanced"],
    },
    duration: {
      type: String,
      required: true, // e.g., "8 weeks", "3 months"
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
    },
    thumbnail: {
      type: String, // Cloudinary URL
    },
    image: {
      type: String, // Course main image - Cloudinary URL
      required: true,
    },
    brochure: {
      filename: {
        type: String,
      },
      url: {
        type: String, // Cloudinary URL or file path
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
      size: {
        type: Number, // File size in bytes
      },
    },
    prerequisites: [{
      type: String,
    }],
    learningOutcomes: [{
      type: String,
      required: true,
    }],
    tags: [{
      type: String,
    }],
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assistants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    modules: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
    }],
    totalStudents: {
      type: Number,
      default: 0,
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published",
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    maxStudents: {
      type: Number,
      default: null, // null means unlimited
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index for search functionality
courseSchema.index({ title: "text", description: "text", tags: "text" });
courseSchema.index({ category: 1, level: 1, status: 1 });
courseSchema.index(
  { code: 1 },
  { unique: true, partialFilterExpression: { code: { $type: "string" } } },
);

export default mongoose.model("Course", courseSchema);
