import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plan: {
      type: String,
      enum: ["bronze", "silver", "gold"],
      required: true,
    },
    planDetails: {
      name: String,
      price: Number,
      currency: { type: String, default: "NGN" },
      billing: { type: String, enum: ["one-time", "monthly"], required: true },
      features: [{
        feature: String,
        duration: String, // e.g., "1-month", "lifetime"
        included: { type: Boolean, default: true }
      }]
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled", "pending"],
      default: "pending",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    // Payment tracking
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "NGN",
    },
    paymentMethod: {
      type: String,
      enum: ["card", "bank_transfer", "ussd"],
      required: true,
    },
    transactionReference: {
      type: String,
      required: true,
      unique: true,
    },
    paystackReference: {
      type: String,
      unique: true,
      sparse: true,
    },
    // Feature access tracking
    featureAccess: {
      aiTutor: {
        hasAccess: { type: Boolean, default: false },
        expiresAt: Date,
      },
      mentorship: {
        hasAccess: { type: Boolean, default: false },
        expiresAt: Date,
        sessionsUsed: { type: Number, default: 0 },
        sessionsLimit: { type: Number, default: 4 }, // Weekly sessions for a month
      },
      courseAccess: {
        hasLifetimeAccess: { type: Boolean, default: false },
        courses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
      },
      premiumResources: {
        hasAccess: { type: Boolean, default: false },
        expiresAt: Date,
      },
      certificate: {
        hasAccess: { type: Boolean, default: false },
      },
      alumniCommunity: {
        hasAccess: { type: Boolean, default: false },
        expiresAt: Date,
      },
      linkedinOptimization: {
        hasAccess: { type: Boolean, default: false },
      },
      networking: {
        hasAccess: { type: Boolean, default: false },
        expiresAt: Date,
      }
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    // Auto-renewal tracking
    autoRenewal: {
      enabled: { type: Boolean, default: false },
      nextBillingDate: Date,
      lastRenewalAttempt: Date,
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for efficient queries
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ endDate: 1, status: 1 });
// Note: transactionReference index is automatically created by unique: true constraint

// Virtual for checking if subscription is currently active
subscriptionSchema.virtual('isCurrentlyActive').get(function() {
  return this.status === 'active' && this.endDate > new Date();
});

// Method to check if specific feature is accessible
subscriptionSchema.methods.hasFeatureAccess = function(featureName) {
  if (!this.featureAccess || !this.featureAccess[featureName]) {
    return false;
  }

  const feature = this.featureAccess[featureName];
  
  // Check if feature has access
  if (!feature.hasAccess) {
    return false;
  }

  // Check if feature has expired (if it has an expiry date)
  if (feature.expiresAt && feature.expiresAt < new Date()) {
    return false;
  }

  return true;
};

// Method to extend feature access
subscriptionSchema.methods.extendFeatureAccess = function(featureName, durationInDays) {
  if (!this.featureAccess) {
    this.featureAccess = {};
  }
  
  if (!this.featureAccess[featureName]) {
    this.featureAccess[featureName] = {};
  }

  const feature = this.featureAccess[featureName];
  const currentDate = new Date();
  const extendFromDate = feature.expiresAt && feature.expiresAt > currentDate 
    ? feature.expiresAt 
    : currentDate;

  feature.hasAccess = true;
  feature.expiresAt = new Date(extendFromDate.getTime() + (durationInDays * 24 * 60 * 60 * 1000));
};

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
