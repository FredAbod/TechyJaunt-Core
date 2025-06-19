import mongoose from "mongoose";

const userCourseProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["enrolled", "in-progress", "completed", "dropped"],
      default: "enrolled",
    },
    progress: {
      completedLessons: [{
        lessonId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Lesson",
        },
        completedAt: {
          type: Date,
          default: Date.now,
        },
        timeSpent: {
          type: Number, // in seconds
          default: 0,
        },
      }],
      currentLesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson",
      },
      totalLessons: {
        type: Number,
        default: 0,
      },
      completedLessonsCount: {
        type: Number,
        default: 0,
      },
      progressPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },
    timeSpent: {
      total: {
        type: Number, // in seconds
        default: 0,
      },
      thisWeek: {
        type: Number,
        default: 0,
      },
      thisMonth: {
        type: Number,
        default: 0,
      },
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
    completionDate: {
      type: Date,
    },
    certificateIssued: {
      type: Boolean,
      default: false,
    },
    rating: {
      score: {
        type: Number,
        min: 1,
        max: 5,
      },
      review: {
        type: String,
      },
      ratedAt: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Ensure unique enrollment per user per course
userCourseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

// Method to calculate progress percentage
userCourseProgressSchema.methods.calculateProgress = function() {
  if (this.progress.totalLessons === 0) return 0;
  return Math.round((this.progress.completedLessonsCount / this.progress.totalLessons) * 100);
};

// Update progress percentage before saving
userCourseProgressSchema.pre('save', function(next) {
  this.progress.progressPercentage = this.calculateProgress();
  next();
});

export default mongoose.model("UserCourseProgress", userCourseProgressSchema);
