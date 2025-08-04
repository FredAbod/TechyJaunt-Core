import { successResMsg, errorResMsg } from "../../../utils/lib/response.js";
import SubscriptionService from "../services/subscription.service.js";
import logger from "../../../utils/log/logger.js";

export const getSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionService.getSubscriptionPlans();

    return successResMsg(res, 200, {
      message: "Subscription plans retrieved successfully",
      plans
    });
  } catch (error) {
    logger.error(`Get subscription plans error: ${error.message}`);
    return errorResMsg(res, 500, "Failed to retrieve subscription plans");
  }
};

export const initializeSubscription = async (req, res) => {
  try {
    const { userId, email, firstName, lastName } = req.user;
    const { planType, courseId } = req.body;

    const userName = `${firstName || ''} ${lastName || ''}`.trim() || email;

    const result = await SubscriptionService.initializeSubscription(
      userId,
      planType,
      email,
      userName,
      courseId
    );

    return successResMsg(res, 200, {
      message: "Subscription payment initialized successfully",
      ...result
    });
  } catch (error) {
    logger.error(`Initialize subscription error: ${error.message}`);
    
    // Ensure status code is a valid number
    const statusCode = typeof error.status === 'number' ? error.status : 500;
    const errorMessage = error.message || "Failed to initialize subscription";
    
    return errorResMsg(res, statusCode, errorMessage);
  }
};

export const verifySubscription = async (req, res) => {
  try {
    const { reference } = req.params;

    const subscription = await SubscriptionService.verifySubscription(reference);

    return successResMsg(res, 200, {
      message: "Subscription verified successfully",
      subscription
    });
  } catch (error) {
    logger.error(`Verify subscription error: ${error.message}`);
    const statusCode = typeof error.status === 'number' ? error.status : 500;
    return errorResMsg(res, statusCode, error.message || "Failed to verify subscription");
  }
};

export const getUserSubscriptions = async (req, res) => {
  try {
    const { userId } = req.user;

    const subscriptions = await SubscriptionService.getUserSubscriptions(userId);

    return successResMsg(res, 200, {
      message: "User subscriptions retrieved successfully",
      subscriptions,
      count: subscriptions.length
    });
  } catch (error) {
    logger.error(`Get user subscriptions error: ${error.message}`);
    return errorResMsg(res, error.status || 500, error.message || "Failed to retrieve subscriptions");
  }
};

export const getUserSubscriptionStatus = async (req, res) => {
  try {
    const { userId } = req.user;

    const subscriptionStatus = await SubscriptionService.getUserSubscriptionStatus(userId);

    return successResMsg(res, 200, {
      message: "Subscription status retrieved successfully",
      ...subscriptionStatus
    });
  } catch (error) {
    logger.error(`Get subscription status error: ${error.message}`);
    return errorResMsg(res, error.status || 500, error.message || "Failed to retrieve subscription status");
  }
};

export const getSubscriptionDetails = async (req, res) => {
  try {
    const { reference } = req.params;
    const { userId } = req.user;

    const subscription = await SubscriptionService.verifySubscription(reference);

    // Ensure user can only view their own subscription
    if (subscription.user.toString() !== userId) {
      return errorResMsg(res, 403, "Access denied");
    }

    return successResMsg(res, 200, {
      message: "Subscription details retrieved successfully",
      subscription
    });
  } catch (error) {
    logger.error(`Get subscription details error: ${error.message}`);
    return errorResMsg(res, error.status || 500, error.message || "Failed to retrieve subscription details");
  }
};

export const handleSubscriptionWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const payload = req.body;

    const result = await SubscriptionService.handleSubscriptionWebhook(payload, signature);

    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Subscription webhook error: ${error.message}`);
    return errorResMsg(res, error.status || 500, error.message || "Webhook processing failed");
  }
};
