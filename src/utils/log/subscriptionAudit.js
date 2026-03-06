import SubscriptionAuditLog from "../../resources/payments/models/subscriptionAuditLog.js";
import logger from "./logger.js";

/**
 * Log a feature access attempt (blocked or allowed)
 * This is a fire-and-forget operation that won't block the main request
 * 
 * @param {Object} params - Log parameters
 * @param {string} params.userId - User ID
 * @param {string} params.feature - Feature name (aiTutor, mentorship, etc.)
 * @param {string} params.courseId - Course ID (optional)
 * @param {boolean} params.allowed - Whether access was allowed
 * @param {string} params.reason - Reason for the decision
 * @param {string} params.plan - User's plan at time of attempt (optional)
 * @param {Object} params.requestDetails - Request details (ip, userAgent, endpoint, method)
 * @param {Object} params.metadata - Additional metadata (optional)
 * @returns {Promise<void>}
 */
export const logFeatureAccessAttempt = async ({
  userId,
  feature,
  courseId = null,
  allowed,
  reason,
  plan = null,
  requestDetails = {},
  metadata = {},
}) => {
  try {
    // Only log blocked attempts by default to reduce storage
    // Can be configured to log all attempts if needed
    const shouldLogAllAttempts = process.env.LOG_ALL_SUBSCRIPTION_ATTEMPTS === "true";
    
    if (!shouldLogAllAttempts && allowed) {
      return; // Skip logging allowed attempts unless configured
    }

    const logEntry = new SubscriptionAuditLog({
      user: userId,
      feature,
      courseId: courseId || undefined,
      action: allowed ? "allowed" : "blocked",
      reason,
      planAttempted: plan,
      requestDetails,
      metadata,
    });

    // Fire-and-forget - don't await in production to avoid blocking
    await logEntry.save();

    // Also log to application logger for immediate visibility
    if (!allowed) {
      logger.warn(`Subscription access blocked`, {
        userId,
        feature,
        courseId,
        reason,
        plan,
      });
    }
  } catch (error) {
    // Don't throw - audit logging failures shouldn't affect the main request
    logger.error(`Failed to log subscription access attempt:`, {
      error: error.message,
      userId,
      feature,
      allowed,
    });
  }
};

/**
 * Get blocked access attempts summary for analytics dashboard
 * 
 * @param {Object} options - Query options
 * @param {Date} options.startDate - Start date for the query
 * @param {Date} options.endDate - End date for the query
 * @param {string} options.userId - Filter by user ID (optional)
 * @param {string} options.feature - Filter by feature (optional)
 * @returns {Promise<Array>} Summary of blocked attempts
 */
export const getBlockedAttemptsSummary = async (options = {}) => {
  try {
    return await SubscriptionAuditLog.getBlockedAttemptsSummary(options);
  } catch (error) {
    logger.error(`Failed to get blocked attempts summary:`, error.message);
    throw error;
  }
};

/**
 * Get a user's blocked access history
 * 
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of records to return
 * @param {string} options.feature - Filter by feature (optional)
 * @returns {Promise<Array>} User's blocked access history
 */
export const getUserBlockedHistory = async (userId, options = {}) => {
  try {
    return await SubscriptionAuditLog.getUserBlockedHistory(userId, options);
  } catch (error) {
    logger.error(`Failed to get user blocked history:`, error.message);
    throw error;
  }
};

/**
 * Create an audit log entry with request context
 * Helper for use in middleware where request object is available
 * 
 * @param {Object} req - Express request object
 * @param {Object} params - Additional log parameters
 * @returns {Promise<void>}
 */
export const logFromRequest = async (req, params) => {
  const requestDetails = {
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get("User-Agent"),
    endpoint: req.originalUrl,
    method: req.method,
  };

  return logFeatureAccessAttempt({
    ...params,
    requestDetails,
  });
};

export default {
  logFeatureAccessAttempt,
  getBlockedAttemptsSummary,
  getUserBlockedHistory,
  logFromRequest,
};
