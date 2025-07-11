import AITutorService from "../services/aiTutor.service.js";
import SubscriptionService from "../../payments/services/subscription.service.js";
import { successResMsg, errorResMsg } from "../../../utils/lib/response.js";
import logger from "../../../utils/log/logger.js";

/**
 * Generate topic explanation using AI Tutor
 */
export const getTopicExplanation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { topic, userLevel = "intermediate", specificQuestions = [] } = req.body;

    // Validate required fields
    if (!topic || topic.trim().length === 0) {
      return errorResMsg(res, 400, "Topic is required");
    }

    // Check if user has AI Tutor access
    const subscriptionStatus = await SubscriptionService.getUserSubscriptionStatus(userId);
    
    if (!subscriptionStatus.featureAccess.aiTutor) {
      return errorResMsg(res, 403, "AI Tutor access requires an active subscription. Please upgrade your plan to access this feature.");
    }

    // Generate AI response
    const explanation = await AITutorService.generateTopicExplanation(
      topic.trim(),
      userLevel,
      Array.isArray(specificQuestions) ? specificQuestions : []
    );

    logger.info(`AI Tutor topic explanation generated for user ${userId}: ${topic}`);

    return successResMsg(res, 200, {
      message: "Topic explanation generated successfully",
      data: explanation
    });

  } catch (error) {
    logger.error(`AI Tutor topic explanation error: ${error.message}`);
    return errorResMsg(res, error.status || 500, error.message);
  }
};

/**
 * Generate study plan using AI Tutor
 */
export const generateStudyPlan = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { topic, duration = "1 week", goals = [] } = req.body;

    // Validate required fields
    if (!topic || topic.trim().length === 0) {
      return errorResMsg(res, 400, "Topic is required");
    }

    // Check if user has AI Tutor access
    const subscriptionStatus = await SubscriptionService.getUserSubscriptionStatus(userId);
    
    if (!subscriptionStatus.featureAccess.aiTutor) {
      return errorResMsg(res, 403, "AI Tutor access requires an active subscription. Please upgrade your plan to access this feature.");
    }

    // Generate study plan
    const studyPlan = await AITutorService.generateStudyPlan(
      topic.trim(),
      duration,
      Array.isArray(goals) ? goals : []
    );

    logger.info(`AI Tutor study plan generated for user ${userId}: ${topic}`);

    return successResMsg(res, 200, {
      message: "Study plan generated successfully",
      data: studyPlan
    });

  } catch (error) {
    logger.error(`AI Tutor study plan error: ${error.message}`);
    return errorResMsg(res, error.status || 500, error.message);
  }
};

/**
 * Answer specific questions using AI Tutor
 */
export const answerQuestion = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { question, context = "", userLevel = "intermediate" } = req.body;

    // Validate required fields
    if (!question || question.trim().length === 0) {
      return errorResMsg(res, 400, "Question is required");
    }

    // Check if user has AI Tutor access
    const subscriptionStatus = await SubscriptionService.getUserSubscriptionStatus(userId);
    
    if (!subscriptionStatus.featureAccess.aiTutor) {
      return errorResMsg(res, 403, "AI Tutor access requires an active subscription. Please upgrade your plan to access this feature.");
    }

    // Generate answer
    const answer = await AITutorService.answerQuestion(
      question.trim(),
      context,
      userLevel
    );

    logger.info(`AI Tutor question answered for user ${userId}: ${question.substring(0, 50)}...`);

    return successResMsg(res, 200, {
      message: "Question answered successfully",
      data: answer
    });

  } catch (error) {
    logger.error(`AI Tutor answer question error: ${error.message}`);
    return errorResMsg(res, error.status || 500, error.message);
  }
};

/**
 * Generate practice exercises using AI Tutor
 */
export const generatePracticeExercises = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { topic, difficulty = "intermediate", count = 3 } = req.body;

    // Validate required fields
    if (!topic || topic.trim().length === 0) {
      return errorResMsg(res, 400, "Topic is required");
    }

    // Validate count
    const exerciseCount = parseInt(count);
    if (isNaN(exerciseCount) || exerciseCount < 1 || exerciseCount > 10) {
      return errorResMsg(res, 400, "Exercise count must be between 1 and 10");
    }

    // Check if user has AI Tutor access
    const subscriptionStatus = await SubscriptionService.getUserSubscriptionStatus(userId);
    
    if (!subscriptionStatus.featureAccess.aiTutor) {
      return errorResMsg(res, 403, "AI Tutor access requires an active subscription. Please upgrade your plan to access this feature.");
    }

    // Generate exercises
    const exercises = await AITutorService.generatePracticeExercises(
      topic.trim(),
      difficulty,
      exerciseCount
    );

    logger.info(`AI Tutor exercises generated for user ${userId}: ${topic}`);

    return successResMsg(res, 200, {
      message: "Practice exercises generated successfully",
      data: exercises
    });

  } catch (error) {
    logger.error(`AI Tutor exercises error: ${error.message}`);
    return errorResMsg(res, error.status || 500, error.message);
  }
};

/**
 * Get AI Tutor service status
 */
export const getServiceStatus = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Check if user has AI Tutor access
    const subscriptionStatus = await SubscriptionService.getUserSubscriptionStatus(userId);
    
    if (!subscriptionStatus.featureAccess.aiTutor) {
      return errorResMsg(res, 403, "AI Tutor access requires an active subscription. Please upgrade your plan to access this feature.");
    }

    // Get service status
    const status = await AITutorService.getServiceStatus();

    return successResMsg(res, 200, {
      message: "AI Tutor service status retrieved successfully",
      data: {
        ...status,
        userAccess: {
          hasAccess: true,
          subscriptionPlans: subscriptionStatus.activePlans
        }
      }
    });

  } catch (error) {
    logger.error(`AI Tutor service status error: ${error.message}`);
    return errorResMsg(res, error.status || 500, error.message);
  }
};

/**
 * Get user's AI Tutor access info
 */
export const getAccessInfo = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get subscription status
    const subscriptionStatus = await SubscriptionService.getUserSubscriptionStatus(userId);

    const accessInfo = {
      hasAccess: subscriptionStatus.featureAccess.aiTutor,
      activePlans: subscriptionStatus.activePlans,
      totalActiveSubscriptions: subscriptionStatus.totalActiveSubscriptions
    };

    // If user has access, provide additional details
    if (accessInfo.hasAccess) {
      accessInfo.availableFeatures = [
        "Topic explanations and educational content",
        "Personalized study plan generation",
        "Question and answer assistance",
        "Practice exercises and challenges",
        "Learning guidance and tips"
      ];
    } else {
      accessInfo.upgradeMessage = "Subscribe to Bronze, Silver, or Gold plan to access AI Tutor features";
      accessInfo.availablePlans = [
        {
          name: "Bronze Plan",
          price: "₦15,800",
          aiTutorDuration: "1 month"
        },
        {
          name: "Silver Plan", 
          price: "₦30,000",
          aiTutorDuration: "1 month"
        },
        {
          name: "Gold Plan",
          price: "₦50,000", 
          aiTutorDuration: "1 month"
        }
      ];
    }

    return successResMsg(res, 200, {
      message: "AI Tutor access information retrieved successfully",
      data: accessInfo
    });

  } catch (error) {
    logger.error(`AI Tutor access info error: ${error.message}`);
    return errorResMsg(res, error.status || 500, error.message);
  }
};
