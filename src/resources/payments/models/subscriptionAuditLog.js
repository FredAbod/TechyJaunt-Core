import mongoose from "mongoose";

const subscriptionAuditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    feature: {
      type: String,
      required: true,
      enum: [
        "aiTutor",
        "mentorship",
        "courseAccess",
        "premiumResources",
        "certificate",
        "alumniCommunity",
        "linkedinOptimization",
        "networking",
      ],
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      sparse: true,
    },
    action: {
      type: String,
      required: true,
      enum: ["blocked", "allowed"],
      index: true,
    },
    reason: {
      type: String,
      required: true,
    },
    planAttempted: {
      type: String,
      enum: ["bronze", "silver", "gold", null],
      default: null,
    },
    requestDetails: {
      ip: String,
      userAgent: String,
      endpoint: String,
      method: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
subscriptionAuditLogSchema.index({ user: 1, feature: 1, createdAt: -1 });
subscriptionAuditLogSchema.index({ action: 1, createdAt: -1 });
subscriptionAuditLogSchema.index({ courseId: 1, createdAt: -1 });

// TTL index - automatically delete logs after 90 days
subscriptionAuditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 } // 90 days in seconds
);

// Static method to get blocked attempts summary for analytics
subscriptionAuditLogSchema.statics.getBlockedAttemptsSummary = async function (
  options = {}
) {
  const { startDate, endDate, userId, feature } = options;

  const matchStage = { action: "blocked" };

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  if (userId) matchStage.user = new mongoose.Types.ObjectId(userId);
  if (feature) matchStage.feature = feature;

  const summary = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          feature: "$feature",
          reason: "$reason",
        },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: "$user" },
      },
    },
    {
      $project: {
        feature: "$_id.feature",
        reason: "$_id.reason",
        count: 1,
        uniqueUserCount: { $size: "$uniqueUsers" },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return summary;
};

// Static method to get user's blocked attempts history
subscriptionAuditLogSchema.statics.getUserBlockedHistory = async function (
  userId,
  options = {}
) {
  const { limit = 50, feature } = options;

  const query = {
    user: new mongoose.Types.ObjectId(userId),
    action: "blocked",
  };

  if (feature) query.feature = feature;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("courseId", "title")
    .lean();
};

const SubscriptionAuditLog = mongoose.model(
  "SubscriptionAuditLog",
  subscriptionAuditLogSchema
);

export default SubscriptionAuditLog;
