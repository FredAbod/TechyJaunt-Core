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
    const { topic, userLevel = "intermediate", specificQuestions = [], courseId } = req.body;

    // Validate required fields
    if (!topic || topic.trim().length === 0) {
      return errorResMsg(res, 400, "Topic is required");
    }

    // Check if user has AI Tutor access
    const subscriptionStatus = await SubscriptionService.getUserSubscriptionStatus(userId);
    
    if (!subscriptionStatus.featureAccess.aiTutor) {
      return errorResMsg(res, 403, "AI Tutor access requires an active subscription. Please upgrade your plan to access this feature.");
    }

    const startTime = Date.now();

    // Generate AI response
    const explanation = await AITutorService.generateTopicExplanation(
      topic.trim(),
      userLevel,
      Array.isArray(specificQuestions) ? specificQuestions : []
    );

    const responseTime = Date.now() - startTime;

    // Save interaction to history
    const userInput = `Topic: ${topic}${specificQuestions.length > 0 ? `, Questions: ${specificQuestions.join(', ')}` : ''}`;
    await AITutorService.saveInteraction(userId, {
      courseId,
      type: "explanation",
      topic: topic.trim(),
      userInput,
      aiResponse: explanation.explanation,
      userLevel,
      model: explanation.model,
      tokensUsed: explanation.metadata?.tokens_used,
      responseTime,
      tags: [topic.trim(), userLevel]
    });

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

    // Save interaction to history
    await AITutorService.saveInteraction(userId, {
      type: "question",
      topic: context || undefined,
      userInput: question.trim(),
      aiResponse: answer.answer,
      userLevel,
      model: answer.model,
      responseTime: undefined,
      tags: ["question", userLevel]
    });

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

/**
 * Get user's AI Tutor interaction history
 */
export const getUserHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, courseId, type } = req.query;

    // Check if user has AI Tutor access
    const subscriptionStatus = await SubscriptionService.getUserSubscriptionStatus(userId);
    
    if (!subscriptionStatus.featureAccess.aiTutor) {
      return errorResMsg(res, 403, "AI Tutor access requires an active subscription. Please upgrade your plan to access this feature.");
    }

    // Get user's AI interaction history
    const history = await AITutorService.getUserHistory(userId, {
      limit: parseInt(limit),
      courseId,
      type
    });

    logger.info(`AI Tutor history retrieved for user ${userId}`);

    return successResMsg(res, 200, {
      message: "AI Tutor history retrieved successfully",
      data: history
    });

  } catch (error) {
    logger.error(`AI Tutor history error: ${error.message}`);
    return errorResMsg(res, error.status || 500, error.message);
  }
};

/**
 * Get detailed AI Tutor interaction history item
 */
export const getHistoryItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { historyId } = req.params;

    // Check if user has AI Tutor access
    const subscriptionStatus = await SubscriptionService.getUserSubscriptionStatus(userId);
    
    if (!subscriptionStatus.featureAccess.aiTutor) {
      return errorResMsg(res, 403, "AI Tutor access requires an active subscription. Please upgrade your plan to access this feature.");
    }

    // Get detailed history item
    const historyItem = await AITutorService.getHistoryItem(userId, historyId);

    logger.info(`AI Tutor history item retrieved for user ${userId}: ${historyId}`);

    return successResMsg(res, 200, {
      message: "AI Tutor history item retrieved successfully",
      data: historyItem
    });

  } catch (error) {
    logger.error(`AI Tutor history item error: ${error.message}`);
    return errorResMsg(res, error.status || 500, error.message);
  }
};
