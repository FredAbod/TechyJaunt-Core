import axios from "axios";
import crypto from "crypto";
import mongoose from "mongoose";
import Subscription from "../models/subscription.js";
import SubscriptionPlan from "../models/subscriptionPlan.js";
import AppError from "../../../utils/lib/appError.js";
import { PAYSTACK_SECRET_KEY } from "../../../utils/helper/config.js";
import { generateRandomString } from "../../../utils/helper/helper.js";
import logger from "../../../utils/log/logger.js";

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
  async initializeSubscription(userId, planType, userEmail, userName, courseId) {
    try {
      // Convert userId to ObjectId if it's a string
      const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
      
      // Validate courseId and check if course exists
      if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
        throw new AppError("Invalid course ID", 400);
      }

      // Import Course model dynamically to avoid circular dependencies
      const Course = (await import("../../courses/models/course.js")).default;
      const course = await Course.findById(courseId);
      if (!course) {
        throw new AppError("Course not found", 404);
      }

      // Check if user already has an active subscription for this plan and course
      const existingSubscription = await Subscription.findOne({
        user: userObjectId,
        plan: planType,
        courseId: new mongoose.Types.ObjectId(courseId),
        status: { $in: ['active', 'pending'] }
      });

      if (existingSubscription) {
        // Check if subscription is active and not expired
        if (existingSubscription.status === 'active' && existingSubscription.endDate > new Date()) {
          throw new AppError(`You already have an active ${planType} subscription for this course. Your subscription expires on ${existingSubscription.endDate.toLocaleDateString()}.`, 400);
        }
        
        // Check if subscription is pending (payment not completed)
        if (existingSubscription.status === 'pending') {
          // Check if pending subscription is recent (within last 1 hour)
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          if (existingSubscription.createdAt > oneHourAgo) {
            throw new AppError("You have a recent pending subscription payment for this plan and course. Please complete the payment or wait for it to expire before creating a new subscription.", 400);
          }
          // If pending subscription is old, we can allow a new one (old one likely failed)
        }
      }

      // Also check for any active subscription regardless of plan type for the same course
      const anyActiveSubscription = await Subscription.findOne({
        user: userObjectId,
        courseId: new mongoose.Types.ObjectId(courseId),
        status: 'active',
        endDate: { $gt: new Date() }
      });

      if (anyActiveSubscription && anyActiveSubscription.plan !== planType) {
        throw new AppError(`You already have an active ${anyActiveSubscription.plan} subscription for this course. You cannot subscribe to multiple plans for the same course.`, 400);
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
        callback_url: `${process.env.FRONTEND_URL}/learning-hub/dashboard/${courseId}/subscription/confirmation`,
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
            },
            {
              display_name: "Course",
              variable_name: "course_title",
              value: course.title
            },
            {
              display_name: "Course ID",
              variable_name: "course_id",
              value: courseId
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
        courseId: new mongoose.Types.ObjectId(courseId),
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
      })
      .populate('courseId', 'title category level image thumbnail')
      .sort({ createdAt: -1 });

      return subscriptions.map(sub => ({
        id: sub._id,
        plan: sub.plan,
        planName: sub.planDetails.name,
        course: sub.courseId ? {
          id: sub.courseId._id,
          title: sub.courseId.title,
          category: sub.courseId.category,
          level: sub.courseId.level,
          image: sub.courseId.image,
          thumbnail: sub.courseId.thumbnail
        } : null,
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
      })
      .populate('courseId', 'title category level image thumbnail');

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
          course: sub.courseId ? {
            id: sub.courseId._id,
            title: sub.courseId.title,
            category: sub.courseId.category,
            level: sub.courseId.level,
            image: sub.courseId.image,
            thumbnail: sub.courseId.thumbnail
          } : null,
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
      logger.info(`Processing subscription webhook - Event: ${event}, Reference: ${data.reference}`);

      if (event === 'charge.success') {
        const reference = data.reference;
        
        // Find and update subscription
        const subscription = await Subscription.findOne({ transactionReference: reference });
        
        if (!subscription) {
          logger.warn(`Subscription not found for reference: ${reference}`);
          return { status: 'error', message: 'Subscription not found' };
        }

        // Update subscription status
        subscription.status = 'active';
        subscription.paystackReference = data.reference;
        subscription.paymentMethod = data.channel;
        subscription.metadata = data;
        await subscription.save();

        logger.info(`Subscription ${subscription._id} activated for user ${subscription.user}`);

        // Initialize progress tracking for the user
        try {
          // Import progress service dynamically to avoid circular dependencies
          const progressService = (await import("../../courses/services/progress.service.js")).default;
          
          logger.info(`Initializing progress for user ${subscription.user} in course ${subscription.courseId}`);
          
          await progressService.initializeProgress(
            subscription.user,
            subscription.courseId,
            subscription._id
          );
          
          logger.info(`✅ Progress successfully initialized for user ${subscription.user} in course ${subscription.courseId}`);
          
          return { 
            status: 'success', 
            message: 'Subscription activated and progress initialized',
            subscriptionId: subscription._id,
            progressInitialized: true
          };
          
        } catch (progressError) {
          // Log detailed error but don't fail the webhook - subscription is still valid
          logger.error(`❌ Failed to initialize progress for subscription ${subscription._id}:`, {
            error: progressError.message,
            stack: progressError.stack,
            userId: subscription.user,
            courseId: subscription.courseId,
            subscriptionId: subscription._id
          });
          
          return { 
            status: 'partial_success', 
            message: 'Subscription activated but progress initialization failed',
            subscriptionId: subscription._id,
            progressInitialized: false,
            progressError: progressError.message
          };
        }
      } else {
        logger.info(`Ignoring webhook event: ${event} for reference: ${data.reference}`);
        return { status: 'ignored', message: `Event ${event} not processed` };
      }

    } catch (error) {
      logger.error(`Webhook processing failed:`, {
        error: error.message,
        stack: error.stack,
        payload: payload
      });
      throw new AppError(error.message || "Webhook processing failed", error.status || 500);
    }
  }
}

export default new SubscriptionService();
