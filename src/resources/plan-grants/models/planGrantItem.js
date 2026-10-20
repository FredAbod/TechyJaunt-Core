import mongoose from "mongoose";
import {
  ITEM_OUTCOME,
  ITEM_STATUS,
  NOTIFICATION_STATUS,
} from "../planGrant.constants.js";

// One row per recipient. Kept out of the job document so jobs stay small
// and results can be filtered/paginated by status.
const planGrantItemSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlanGrantJob",
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    firstName: String,
    lastName: String,
    // Absent on rows created before per-row courses (the job's courseId applies)
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
    courseTitle: String,
    courseCode: String,
    status: {
      type: String,
      enum: Object.values(ITEM_STATUS),
      default: ITEM_STATUS.PENDING,
    },
    outcome: {
      type: String,
      enum: Object.values(ITEM_OUTCOME),
    },
    reason: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },
    notification: {
      status: {
        type: String,
        enum: Object.values(NOTIFICATION_STATUS),
        default: NOTIFICATION_STATUS.PENDING,
      },
      sentAt: Date,
      error: String,
      // The email carried a temporary password
      withCredentials: Boolean,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastError: String,
    processedAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// One row per person per course
planGrantItemSchema.index(
  { job: 1, email: 1, courseId: 1 },
  { unique: true, name: "job_email_course_unique" },
);
planGrantItemSchema.index({ job: 1, status: 1, index: 1 });
planGrantItemSchema.index({ job: 1, courseId: 1, status: 1 });

/**
 * Drop the pre-per-row-course unique index (job, email), which would reject
 * the same email on two courses. Safe to call on every startup.
 */
planGrantItemSchema.statics.dropLegacyIndexes = async function () {
  try {
    await this.collection.dropIndex("job_1_email_1");
    return true;
  } catch (error) {
    // 27 = IndexNotFound, 26 = NamespaceNotFound (collection not created yet)
    if ([26, 27].includes(error?.code)) return false;
    throw error;
  }
};

const PlanGrantItem = mongoose.model("PlanGrantItem", planGrantItemSchema);

export default PlanGrantItem;
