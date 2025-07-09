import mongoose from "mongoose";

const subscriptionPlanSchema = new mongoose.Schema(
  {
    planType: {
      type: String,
      required: true,
      unique: true,
      enum: ["bronze", "silver", "gold"],
      lowercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      default: "NGN",
      uppercase: true
    },
    billing: {
      type: String,
      required: true,
      enum: ["one-time", "monthly", "yearly"],
      lowercase: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    features: [
      {
        feature: {
          type: String,
          required: true,
          trim: true
        },
        duration: {
          type: String,
          required: true,
          enum: ["lifetime", "1-month", "3-months", "6-months", "1-year"],
          lowercase: true
        },
        included: {
          type: Boolean,
          required: true,
          default: true
        },
        limit: {
          type: Number,
          default: null
        }
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    },
    sortOrder: {
      type: Number,
      default: 0
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for efficient queries
subscriptionPlanSchema.index({ planType: 1, isActive: 1 });
subscriptionPlanSchema.index({ isActive: 1, sortOrder: 1 });

// Virtual for formatted price
subscriptionPlanSchema.virtual('formattedPrice').get(function() {
  if (this.currency === 'NGN') {
    return `₦${(this.price / 100).toLocaleString()}`;
  }
  return `${this.currency} ${(this.price / 100).toFixed(2)}`;
});

// Static method to get active plans
subscriptionPlanSchema.statics.getActivePlans = function() {
  return this.find({ isActive: true }).sort({ sortOrder: 1, planType: 1 });
};

// Static method to get plan by type
subscriptionPlanSchema.statics.getPlanByType = function(planType) {
  return this.findOne({ planType: planType.toLowerCase(), isActive: true });
};

// Instance method to check if plan has specific feature
subscriptionPlanSchema.methods.hasFeature = function(featureName) {
  return this.features.some(feature => 
    feature.feature.toLowerCase().includes(featureName.toLowerCase()) && feature.included
  );
};

// Instance method to get feature details
subscriptionPlanSchema.methods.getFeatureDetails = function(featureName) {
  return this.features.find(feature => 
    feature.feature.toLowerCase().includes(featureName.toLowerCase()) && feature.included
  );
};

const SubscriptionPlan = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);

export default SubscriptionPlan;
