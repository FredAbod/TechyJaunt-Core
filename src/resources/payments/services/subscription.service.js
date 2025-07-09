import axios from "axios";
import crypto from "crypto";
import mongoose from "mongoose";
import Subscription from "../models/subscription.js";
import SubscriptionPlan from "../models/subscriptionPlan.js";
import AppError from "../../../utils/lib/appError.js";
import { PAYSTACK_SECRET_KEY } from "../../../utils/helper/config.js";
import { generateRandomString } from "../../../utils/helper/helper.js";

class SubscriptionService {
  constructor() {
    // Validate Paystack secret key
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error("PAYSTACK_SECRET_KEY environment variable is required");
    }

    if (!PAYSTACK_SECRET_KEY.startsWith('sk_')) {
      throw new Error("Invalid PAYSTACK_SECRET_KEY format. Must start with 'sk_'");
    }

    this.paystackConfig = {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    };
  }

  // Get subscription plans from database
  async getSubscriptionPlans() {
    try {
      const plans = await SubscriptionPlan.getActivePlans();
      
      // Convert to the expected format for backward compatibility
      const planMap = {};
      plans.forEach(plan => {
        planMap[plan.planType] = {
          id: plan._id,
          name: plan.name,
          price: plan.price,
          currency: plan.currency,
          billing: plan.billing,
          description: plan.description,
          features: plan.features,
          metadata: plan.metadata,
          formattedPrice: plan.formattedPrice
        };
      });
      
      return planMap;
    } catch (error) {
      throw new AppError("Failed to fetch subscription plans", 500);
    }
  }

  // Get a specific plan by type
  async getPlanByType(planType) {
    try {
      const plan = await SubscriptionPlan.getPlanByType(planType);
      if (!plan) {
        throw new AppError("Invalid subscription plan", 400);
      }
      
      return {
        id: plan._id,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        billing: plan.billing,
        description: plan.description,
        features: plan.features,
        metadata: plan.metadata,
        formattedPrice: plan.formattedPrice
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to fetch subscription plan", 500);
    }
  }

  /**
   * Initialize subscription payment
   */
  async initializeSubscription(userId, planType, userEmail, userName) {
    try {
      // Convert userId to ObjectId if it's a string
      const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
      
      // Check if user already has an active subscription for this plan
      const existingSubscription = await Subscription.findOne({
        user: userObjectId,
        plan: planType,
        status: { $in: ['active', 'pending'] }
      });

      if (existingSubscription && existingSubscription.status === 'active' && existingSubscription.endDate > new Date()) {
        throw new AppError("You already have an active subscription for this plan", 400);
      }

      // Get plan details from database
      const planDetails = await this.getPlanByType(planType);

      // Generate unique transaction reference
      const transactionReference = `TJ_SUB_${generateRandomString(20)}`;

      // Calculate subscription period
      const startDate = new Date();
      const endDate = new Date();
      
      if (planDetails.billing === "monthly") {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        // For one-time payments (Bronze), set a far future date for lifetime access
        endDate.setFullYear(endDate.getFullYear() + 100);
      }

      // Prepare Paystack payload
      const paystackPayload = {
        email: userEmail,
        amount: planDetails.price,
        currency: planDetails.currency,
        reference: transactionReference,
        callback_url: `${process.env.FRONTEND_URL}/subscription/verify`,
        metadata: {
          custom_fields: [
            {
              display_name: "Subscription Plan",
              variable_name: "subscription_plan",
              value: planDetails.name
            },
            {
              display_name: "User Name",
              variable_name: "user_name",
              value: userName
            },
            {
              display_name: "Plan Type",
              variable_name: "plan_type",
              value: planType
            },
            {
              display_name: "Billing Type",
              variable_name: "billing_type",
              value: planDetails.billing
            }
          ]
        }
      };

      // Initialize payment with Paystack
      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        paystackPayload,
        this.paystackConfig
      );

      if (!response.data.status) {
        throw new AppError("Failed to initialize payment with Paystack", 500);
      }

      // Setup feature access based on plan
      const featureAccess = this.setupFeatureAccess(planType, startDate, endDate);

      // Create subscription record
      const subscription = new Subscription({
        user: userObjectId,
        plan: planType,
        planDetails,
        amount: planDetails.price,
        currency: planDetails.currency,
        paymentMethod: "card", // Default to card, will be updated via webhook
        transactionReference,
        startDate,
        endDate,
        isRecurring: planDetails.billing === "monthly",
        featureAccess,
        status: "pending"
      });

      await subscription.save();

      return {
        authorizationUrl: response.data.data.authorization_url,
        reference: transactionReference,
        subscription: subscription.toJSON()
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      // Enhanced error handling for Paystack-specific errors
      if (error.response) {
        const errorMessage = error.response.data?.message || "Payment initialization failed";
        if (error.response.status === 401) {
          if (errorMessage.includes('IP address') || errorMessage.includes('not allowed')) {
            throw new AppError("Your IP address is not whitelisted in Paystack. Please add your IP to the Paystack dashboard or disable IP whitelisting for development.", 403);
          }
          throw new AppError("Invalid Paystack API key. Please check your configuration.", 401);
        } else if (error.response.status === 400) {
          throw new AppError(`Payment initialization failed: ${errorMessage}`, 400);
        }
      }
      
      throw new AppError(error.message || "Failed to initialize subscription payment", error.status || 500);
    }
  }

  /**
   * Setup feature access based on subscription plan
   */
  setupFeatureAccess(planType, startDate, endDate) {
    const oneMonthFromStart = new Date(startDate);
    oneMonthFromStart.setMonth(oneMonthFromStart.getMonth() + 1);

    const featureAccess = {
      aiTutor: { hasAccess: false },
      mentorship: { hasAccess: false, sessionsUsed: 0, sessionsLimit: 4 },
      courseAccess: { hasLifetimeAccess: false, courses: [] },
      premiumResources: { hasAccess: false },
      certificate: { hasAccess: false },
      alumniCommunity: { hasAccess: false },
      linkedinOptimization: { hasAccess: false },
      networking: { hasAccess: false }
    };

    switch (planType) {
      case 'bronze':
        featureAccess.courseAccess.hasLifetimeAccess = true;
        featureAccess.certificate.hasAccess = true;
        featureAccess.aiTutor = { hasAccess: true, expiresAt: oneMonthFromStart };
        featureAccess.premiumResources.hasAccess = true;
        featureAccess.linkedinOptimization.hasAccess = true;
        featureAccess.networking.hasAccess = true;
        featureAccess.alumniCommunity.hasAccess = true;
        break;
        
      case 'silver':
        featureAccess.aiTutor = { hasAccess: true, expiresAt: oneMonthFromStart };
        featureAccess.mentorship = { hasAccess: true, expiresAt: oneMonthFromStart, sessionsUsed: 0, sessionsLimit: 4 };
        featureAccess.alumniCommunity = { hasAccess: true, expiresAt: oneMonthFromStart };
        featureAccess.linkedinOptimization.hasAccess = true;
        featureAccess.networking = { hasAccess: true, expiresAt: oneMonthFromStart };
        break;
        
      case 'gold':
        featureAccess.courseAccess.hasLifetimeAccess = true;
        featureAccess.certificate.hasAccess = true;
        featureAccess.aiTutor = { hasAccess: true, expiresAt: oneMonthFromStart };
        featureAccess.mentorship = { hasAccess: true, expiresAt: oneMonthFromStart, sessionsUsed: 0, sessionsLimit: 4 };
        featureAccess.premiumResources.hasAccess = true;
        featureAccess.alumniCommunity = { hasAccess: true, expiresAt: oneMonthFromStart };
        featureAccess.linkedinOptimization.hasAccess = true;
        featureAccess.networking = { hasAccess: true, expiresAt: oneMonthFromStart };
        break;
    }

    return featureAccess;
  }

  /**
   * Verify subscription payment
   */
  async verifySubscription(reference) {
    try {
      // Find subscription by reference
      const subscription = await Subscription.findOne({ transactionReference: reference });
      
      if (!subscription) {
        throw new AppError("Subscription not found", 404);
      }

      // If already verified, return existing data
      if (subscription.status === "success") {
        return subscription;
      }

      // Verify with Paystack
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        this.paystackConfig
      );

      if (!response.data.status) {
        throw new AppError("Payment verification failed", 400);
      }

      const paymentData = response.data.data;

      // Update subscription status
      subscription.status = paymentData.status === "success" ? "active" : "failed";
      subscription.paystackReference = paymentData.reference;
      subscription.paymentMethod = paymentData.channel;
      subscription.metadata = paymentData;

      await subscription.save();

      return subscription;
    } catch (error) {
      throw new AppError(error.message || "Subscription verification failed", error.status || 500);
    }
  }

  /**
   * Get user's active subscriptions
   */
  async getUserSubscriptions(userId) {
    try {
      // Convert userId to ObjectId if it's a string
      const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
      
      const subscriptions = await Subscription.find({
        user: userObjectId
      }).sort({ createdAt: -1 });

      return subscriptions.map(sub => ({
        id: sub._id,
        plan: sub.plan,
        planName: sub.planDetails.name,
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        isCurrentlyActive: sub.isCurrentlyActive,
        isRecurring: sub.isRecurring,
        amount: sub.amount,
        currency: sub.currency,
        featureAccess: sub.featureAccess,
        transactionReference: sub.transactionReference
      }));
    } catch (error) {
      throw new AppError(error.message || "Failed to get user subscriptions", error.status || 500);
    }
  }

  /**
   * Get user's subscription status
   */
  async getUserSubscriptionStatus(userId) {
    try {
      // Convert userId to ObjectId if it's a string
      const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
      
      const activeSubscriptions = await Subscription.find({
        user: userObjectId,
        status: 'active',
        endDate: { $gt: new Date() }
      });

      const hasActiveSubscription = activeSubscriptions.length > 0;
      const activePlans = activeSubscriptions.map(sub => sub.plan);

      // Aggregate feature access from all active subscriptions
      const aggregatedFeatures = {
        aiTutor: false,
        mentorship: false,
        courseAccess: false,
        premiumResources: false,
        certificate: false,
        alumniCommunity: false,
        linkedinOptimization: false,
        networking: false
      };

      activeSubscriptions.forEach(sub => {
        Object.keys(aggregatedFeatures).forEach(feature => {
          if (sub.hasFeatureAccess(feature)) {
            aggregatedFeatures[feature] = true;
          }
        });
      });

      return {
        hasActiveSubscription,
        activePlans,
        totalActiveSubscriptions: activeSubscriptions.length,
        featureAccess: aggregatedFeatures,
        subscriptions: activeSubscriptions.map(sub => ({
          plan: sub.plan,
          endDate: sub.endDate,
          isRecurring: sub.isRecurring
        }))
      };
    } catch (error) {
      throw new AppError(error.message || "Failed to get subscription status", error.status || 500);
    }
  }

  /**
   * Handle subscription webhook
   */
  async handleSubscriptionWebhook(payload, signature) {
    try {
      // Verify webhook signature
      const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(JSON.stringify(payload)).digest('hex');
      
      if (hash !== signature) {
        throw new AppError("Invalid webhook signature", 400);
      }

      const { event, data } = payload;

      if (event === 'charge.success') {
        const reference = data.reference;
        
        // Find and update subscription
        const subscription = await Subscription.findOne({ transactionReference: reference });
        
        if (subscription) {
          subscription.status = 'active';
          subscription.paystackReference = data.reference;
          subscription.paymentMethod = data.channel;
          subscription.metadata = data;
          await subscription.save();
        }
      }

      return { status: 'success' };
    } catch (error) {
      throw new AppError(error.message || "Webhook processing failed", error.status || 500);
    }
  }
}

export default new SubscriptionService();
