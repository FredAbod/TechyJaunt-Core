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

planGrantItemSchema.index({ job: 1, email: 1 }, { unique: true });
planGrantItemSchema.index({ job: 1, status: 1, index: 1 });

const PlanGrantItem = mongoose.model("PlanGrantItem", planGrantItemSchema);

export default PlanGrantItem;
