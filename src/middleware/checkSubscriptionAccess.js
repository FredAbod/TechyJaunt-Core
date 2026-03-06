import SubscriptionService from "../resources/payments/services/subscription.service.js";
import { logFeatureAccessAttempt } from "../utils/log/subscriptionAudit.js";
import { errorResMsg } from "../utils/lib/response.js";
import logger from "../utils/log/logger.js";

/**
 * Middleware factory to check subscription-based feature access
 * 
 * @param {string} featureName - The feature to check access for (aiTutor, mentorship, courseAccess, etc.)
 * @param {Object} options - Configuration options
 * @param {string} options.courseIdParam - Name of the route parameter containing courseId (e.g., 'courseId')
 * @param {string} options.courseIdBody - Name of the body field containing courseId (e.g., 'courseId')
 * @param {boolean} options.requireCourse - If true, courseId is required; if false, falls back to global check
 * @returns {Function} Express middleware function
 * 
 * @example
 * // Route-level usage
 * router.post('/sessions',
 *   isAuthenticated,
 *   checkFeatureAccess('mentorship', { courseIdBody: 'courseId' }),
 *   bookingController.bookSession
 * );
 * 
 * @example
 * // With route param
 * router.get('/course/:courseId/premium-resources',
 *   isAuthenticated,
 *   checkFeatureAccess('premiumResources', { courseIdParam: 'courseId' }),
 *   controller.getPremiumResources
 * );
 */
export const checkFeatureAccess = (featureName, options = {}) => {
  const { courseIdParam, courseIdBody, requireCourse = false } = options;

  return async (req, res, next) => {
    try {
      const userId = req.user?.userId || req.user?._id;

      if (!userId) {
        return errorResMsg(res, 401, "Authentication required");
      }

      // Extract courseId from params or body based on configuration
      let courseId = null;
      if (courseIdParam && req.params[courseIdParam]) {
        courseId = req.params[courseIdParam];
      } else if (courseIdBody && req.body[courseIdBody]) {
        courseId = req.body[courseIdBody];
      }

      // If course is required but not provided
      if (requireCourse && !courseId) {
        return errorResMsg(res, 400, "Course ID is required for this feature");
      }

      // Check feature access
      const accessResult = await SubscriptionService.checkFeatureAccessForCourse(
        userId,
        courseId,
        featureName
      );

      // Log the access attempt (non-blocking)
      logFeatureAccessAttempt({
        userId,
        feature: featureName,
        courseId,
        allowed: accessResult.allowed,
        reason: accessResult.reason,
        plan: accessResult.plan || null,
      }).catch(err => logger.error("Failed to log access attempt:", err.message));

      if (!accessResult.allowed) {
        logger.warn(`Feature access denied: ${featureName} for user ${userId}`, {
          courseId,
          reason: accessResult.reason,
          plan: accessResult.plan,
        });

        return errorResMsg(res, 403, accessResult.reason);
      }

      // Attach subscription status to request for downstream use
      req.subscriptionStatus = {
        allowed: true,
        subscription: accessResult.subscription,
        plan: accessResult.plan,
        mentorshipDetails: accessResult.mentorshipDetails,
        featureName,
      };

      next();
    } catch (error) {
      logger.error(`Error in checkFeatureAccess middleware:`, {
        feature: featureName,
        error: error.message,
        stack: error.stack,
      });

      return errorResMsg(
        res,
        error.statusCode || 500,
        error.message || "Failed to verify subscription access"
      );
    }
  };
};

/**
 * Middleware to check mentorship session limits specifically
 * This is a specialized version that also validates session availability
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.courseIdParam - Name of the route parameter containing courseId
 * @param {string} options.courseIdBody - Name of the body field containing courseId
 * @returns {Function} Express middleware function
 */
export const checkMentorshipAccess = (options = {}) => {
  return checkFeatureAccess('mentorship', options);
};

/**
 * Middleware to check AI Tutor access
 * 
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware function
 */
export const checkAiTutorAccess = (options = {}) => {
  return checkFeatureAccess('aiTutor', options);
};

/**
 * Middleware to check premium resources access
 * 
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware function
 */
export const checkPremiumResourcesAccess = (options = {}) => {
  return checkFeatureAccess('premiumResources', options);
};

/**
 * Middleware to check networking/alumni community access
 * 
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware function
 */
export const checkNetworkingAccess = (options = {}) => {
  return checkFeatureAccess('networking', options);
};

/**
 * Middleware to check alumni community access
 * 
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware function
 */
export const checkAlumniCommunityAccess = (options = {}) => {
  return checkFeatureAccess('alumniCommunity', options);
};

export default {
  checkFeatureAccess,
  checkMentorshipAccess,
  checkAiTutorAccess,
  checkPremiumResourcesAccess,
  checkNetworkingAccess,
  checkAlumniCommunityAccess,
};
