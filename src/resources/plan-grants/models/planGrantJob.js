import mongoose from "mongoose";
import { JOB_STATUS } from "../planGrant.constants.js";

const planGrantJobSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Client-supplied key so a retried/double-clicked request doesn't create a second job
    idempotencyKey: {
      type: String,
    },
    planType: {
      type: String,
      enum: ["bronze", "silver", "gold"],
      required: true,
    },
    // Snapshot of the plan at request time, so grants match what the admin saw
    planSnapshot: {
      name: String,
      price: Number,
      currency: String,
      billing: { type: String, enum: ["one-time", "monthly", "yearly"] },
      features: [mongoose.Schema.Types.Mixed],
    },
    // Single-course jobs (and jobs created before per-row courses) keep the
    // course here; it is also the default for rows that don't name a course.
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
    courseTitle: String,
    // Every course in the job with its row count
    courses: [
      {
        _id: false,
        course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
        title: String,
        code: String,
        total: Number,
      },
    ],
    durationMonths: {
      type: Number,
      min: 1,
    },
    notifyExistingUsers: {
      type: Boolean,
      default: true,
    },
    note: {
      type: String,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: Object.values(JOB_STATUS),
      default: JOB_STATUS.QUEUED,
    },
    totals: {
      submitted: { type: Number, default: 0 },
      duplicatesRemoved: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      granted: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      cancelled: { type: Number, default: 0 },
    },
    cancelRequestedAt: Date,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Worker lease (multi-instance safe claiming + crash recovery)
    leaseOwner: String,
    leaseExpiresAt: Date,
    claimCount: { type: Number, default: 0 },
    startedAt: Date,
    completedAt: Date,
    lastError: String,
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

planGrantJobSchema.index({ status: 1, leaseExpiresAt: 1, createdAt: 1 });
planGrantJobSchema.index({ createdAt: -1 });
planGrantJobSchema.index(
  { createdBy: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  },
);

const PlanGrantJob = mongoose.model("PlanGrantJob", planGrantJobSchema);

export default PlanGrantJob;
