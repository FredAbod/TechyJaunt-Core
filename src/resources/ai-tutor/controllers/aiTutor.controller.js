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
    const { question, context = "", userLevel = "intermediate", chatId, courseId } = req.body;

    // Validate required fields
    if (!question || question.trim().length === 0) {
      return errorResMsg(res, 400, "Question is required");
    }

    // Check if user has AI Tutor access
    const subscriptionStatus = await SubscriptionService.getUserSubscriptionStatus(userId);
    
    if (!subscriptionStatus.featureAccess.aiTutor) {
      return errorResMsg(res, 403, "AI Tutor access requires an active subscription. Please upgrade your plan to access this feature.");
    }

    // If chatId is provided, validate it belongs to the user
    let validatedChatId = chatId;
    if (chatId) {
      const chat = await AITutorService.getChatWithMessages(userId, chatId, { messageLimit: 0 });
      if (!chat) {
        return errorResMsg(res, 404, "Chat not found");
      }
      validatedChatId = chatId;
    }

    // Generate answer
    const answer = await AITutorService.answerQuestion(
      question.trim(),
      context,
      userLevel
    );


    // Save interaction to history and log if it fails
    try {
      const topicForHistory = (context && context.trim().length > 0) ? context.trim() : question.trim();
      const saved = await AITutorService.saveInteraction(userId, {
        chatId: validatedChatId,
        courseId: courseId,
        type: "question",
        topic: topicForHistory,
        userInput: question.trim(),
        aiResponse: answer.answer,
        userLevel,
        model: answer.model,
        responseTime: undefined,
        tags: ["question", userLevel]
      });
      if (saved) {
        logger.info(`AI Tutor history saved for user ${userId}, interactionId: ${saved._id}, chatId: ${validatedChatId}`);
        // Include the saved interaction details in response
        answer.interactionId = saved._id;
        answer.chatId = validatedChatId;
      }
    } catch (historyError) {
      logger.error(`Failed to save AI Tutor question interaction for user ${userId}: ${historyError.message}`);
    }

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

    // Spread the history object so the response data contains { history, pagination, statistics }
    return successResMsg(res, 200, {
      message: "AI Tutor history retrieved successfully",
      ...history
    });

  } catch (error) {
    logger.error(`AI Tutor history error: ${error.message}`);
    // Ensure status is a valid number, else default to 500
    let status = 500;
    if (typeof error.status === 'number' && !isNaN(error.status)) {
      status = error.status;
    }
    return errorResMsg(res, status, error.message);
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

/**
 * Create a new chat session
 */
export const createChat = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { title, courseId, description, tags } = req.body;

    // Check if user has AI Tutor access
    const subscriptionStatus = await SubscriptionService.getUserSubscriptionStatus(userId);
    
    if (!subscriptionStatus.featureAccess.aiTutor) {
      return errorResMsg(res, 403, "AI Tutor access requires an active subscription. Please upgrade your plan to access this feature.");
    }

    // Create new chat
    const chat = await AITutorService.createChat(userId, {
      title,
      courseId,
      description,
      tags
    });

    logger.info(`AI Tutor chat created for user ${userId}: ${chat._id}`);

    return successResMsg(res, 201, {
      message: "Chat created successfully",
      data: chat
    });

  } catch (error) {
    logger.error(`AI Tutor create chat error: ${error.message}`);
    return errorResMsg(res, error.status || 500, error.message);
  }
};

/**
 * Get all user's chats
 */
export const getUserChats = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 20, page = 1, courseId, includeArchived, searchQuery } = req.query;

    // Check if user has AI Tutor access
    const subscriptionStatus = await SubscriptionService.getUserSubscriptionStatus(userId);
    
    if (!subscriptionStatus.featureAccess.aiTutor) {
      return errorResMsg(res, 403, "AI Tutor access requires an active subscription. Please upgrade your plan to access this feature.");
    }

    // Get user's chats
    const result = await AITutorService.getUserChats(userId, {
      limit: parseInt(limit),
      page: parseInt(page),
      courseId,
      includeArchived: includeArchived === 'true',
      searchQuery
    });

    logger.info(`AI Tutor chats retrieved for user ${userId}`);

    return successResMsg(res, 200, {
      message: "Chats retrieved successfully",
      ...result
    });

  } catch (error) {
    logger.error(`AI Tutor get chats error: ${error.message}`);
    return errorResMsg(res, error.status || 500, error.message);
  }
};

/**
 * Get a specific chat with its messages
 */
export const getChatById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { chatId } = req.params;
    const { messageLimit = 50, messagePage = 1 } = req.query;

    // Check if user has AI Tutor access
    const subscriptionStatus = await SubscriptionService.getUserSubscriptionStatus(userId);
    
    if (!subscriptionStatus.featureAccess.aiTutor) {
      return errorResMsg(res, 403, "AI Tutor access requires an active subscription. Please upgrade your plan to access this feature.");
    }

    // Get chat with messages
    const result = await AITutorService.getChatWithMessages(userId, chatId, {
      messageLimit: parseInt(messageLimit),
      messagePage: parseInt(messagePage)
    });

    logger.info(`AI Tutor chat retrieved for user ${userId}: ${chatId}`);

    return successResMsg(res, 200, {
      message: "Chat retrieved successfully",
      data: result
    });

  } catch (error) {
    logger.error(`AI Tutor get chat error: ${error.message}`);
    return errorResMsg(res, error.status || 500, error.message);
  }
};

/**
 * Update a chat
 */
export const updateChat = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { chatId } = req.params;
    const { title, description, isPinned, isArchived, courseId } = req.body;

    // Check if user has AI Tutor access
    const subscriptionStatus = await SubscriptionService.getUserSubscriptionStatus(userId);
    
    if (!subscriptionStatus.featureAccess.aiTutor) {
      return errorResMsg(res, 403, "AI Tutor access requires an active subscription. Please upgrade your plan to access this feature.");
    }

    // Update chat
    const chat = await AITutorService.updateChat(userId, chatId, {
      title,
      description,
      isPinned,
      isArchived,
      courseId
    });

    logger.info(`AI Tutor chat updated for user ${userId}: ${chatId}`);

    return successResMsg(res, 200, {
      message: "Chat updated successfully",
      data: chat
    });

  } catch (error) {
    logger.error(`AI Tutor update chat error: ${error.message}`);
    return errorResMsg(res, error.status || 500, error.message);
  }
};

/**
 * Delete a chat
 */
export const deleteChat = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { chatId } = req.params;

    // Check if user has AI Tutor access
    const subscriptionStatus = await SubscriptionService.getUserSubscriptionStatus(userId);
    
    if (!subscriptionStatus.featureAccess.aiTutor) {
      return errorResMsg(res, 403, "AI Tutor access requires an active subscription. Please upgrade your plan to access this feature.");
    }

    // Delete chat
    const result = await AITutorService.deleteChat(userId, chatId);

    logger.info(`AI Tutor chat deleted for user ${userId}: ${chatId}`);

    return successResMsg(res, 200, {
      message: result.message,
      data: { success: true }
    });

  } catch (error) {
    logger.error(`AI Tutor delete chat error: ${error.message}`);
    return errorResMsg(res, error.status || 500, error.message);
  }
};

/**
 * Get chat statistics
 */
export const getChatStatistics = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Check if user has AI Tutor access
    const subscriptionStatus = await SubscriptionService.getUserSubscriptionStatus(userId);
    
    if (!subscriptionStatus.featureAccess.aiTutor) {
      return errorResMsg(res, 403, "AI Tutor access requires an active subscription. Please upgrade your plan to access this feature.");
    }

    // Get statistics
    const statistics = await AITutorService.getChatStatistics(userId);

    logger.info(`AI Tutor chat statistics retrieved for user ${userId}`);

    return successResMsg(res, 200, {
      message: "Chat statistics retrieved successfully",
      data: statistics
    });

  } catch (error) {
    logger.error(`AI Tutor chat statistics error: ${error.message}`);
    return errorResMsg(res, error.status || 500, error.message);
  }
};
