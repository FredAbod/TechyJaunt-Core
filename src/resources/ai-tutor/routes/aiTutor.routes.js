import express from "express";
import rateLimit from "express-rate-limit";
import { isAuthenticated } from "../../../middleware/isAuthenticated.js";
import { validateRequest } from "../../../middleware/validation.middleware.js";
import * as aiTutorController from "../controllers/aiTutor.controller.js";
import {
  topicExplanationSchema,
  studyPlanSchema,
  questionAnswerSchema,
  practiceExercisesSchema,
  createChatSchema,
  updateChatSchema
} from "../../../utils/validation/aiTutor.validation.js";

const router = express.Router();

// Rate limiting for AI Tutor endpoints
const aiTutorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: "Too many AI Tutor requests from this IP, please try again later.",
  keyGenerator: function (req, res) {
    // Use user token for authenticated rate limiting
    return req.headers.authorization || req.ip;
  },
});

// Stricter rate limiting for AI generation (more resource intensive)
const aiGenerationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // limit each IP to 10 requests per 10 minutes
  message: "AI generation rate limit exceeded. Please wait before making more requests.",
  keyGenerator: function (req, res) {
    return req.headers.authorization || req.ip;
  },
});

// All routes require authentication
router.use(isAuthenticated);

/**
 * @route   GET /api/v1/ai-tutor/access
 * @desc    Get user's AI Tutor access information
 * @access  Private (Authenticated users)
 */
router.get('/access',
  aiTutorLimiter,
  aiTutorController.getAccessInfo
);

/**
 * @route   GET /api/v1/ai-tutor/status
 * @desc    Get AI Tutor service status
 * @access  Private (Subscription required)
 */
router.get('/status',
  aiTutorLimiter,
  aiTutorController.getServiceStatus
);

/**
 * @route   POST /api/v1/ai-tutor/explain
 * @desc    Get AI explanation of a topic
 * @access  Private (Subscription required)
 */
router.post('/explain',
  aiGenerationLimiter,
  validateRequest(topicExplanationSchema),
  aiTutorController.getTopicExplanation
);

/**
 * @route   POST /api/v1/ai-tutor/study-plan
 * @desc    Generate AI study plan for a topic
 * @access  Private (Subscription required)
 */
router.post('/study-plan',
  aiGenerationLimiter,
  validateRequest(studyPlanSchema),
  aiTutorController.generateStudyPlan
);

/**
 * @route   POST /api/v1/ai-tutor/question
 * @desc    Ask AI Tutor a specific question
 * @access  Private (Subscription required)
 */
router.post('/question',
  aiGenerationLimiter,
  validateRequest(questionAnswerSchema),
  aiTutorController.answerQuestion
);

/**
 * @route   POST /api/v1/ai-tutor/exercises
 * @desc    Generate practice exercises for a topic
 * @access  Private (Subscription required)
 */
router.post('/exercises',
  aiGenerationLimiter,
  validateRequest(practiceExercisesSchema),
  aiTutorController.generatePracticeExercises
);

/**
 * @route   GET /api/v1/ai-tutor/history
 * @desc    Get user's AI Tutor interaction history
 * @access  Private (Authenticated users)
 */
router.get('/history',
  aiTutorLimiter,
  aiTutorController.getUserHistory
);

/**
 * @route   GET /api/v1/ai-tutor/history/:historyId
 * @desc    Get detailed AI Tutor interaction history item
 * @access  Private (Authenticated users)
 */
router.get('/history/:historyId',
  aiTutorLimiter,
  aiTutorController.getHistoryItem
);

/**
 * @route   POST /api/v1/ai-tutor/chats
 * @desc    Create a new chat session
 * @access  Private (Subscription required)
 */
router.post('/chats',
  aiTutorLimiter,
  validateRequest(createChatSchema),
  aiTutorController.createChat
);

/**
 * @route   GET /api/v1/ai-tutor/chats
 * @desc    Get all user's chat sessions
 * @access  Private (Subscription required)
 */
router.get('/chats',
  aiTutorLimiter,
  aiTutorController.getUserChats
);

/**
 * @route   GET /api/v1/ai-tutor/chats/statistics
 * @desc    Get chat statistics
 * @access  Private (Subscription required)
 */
router.get('/chats/statistics',
  aiTutorLimiter,
  aiTutorController.getChatStatistics
);

/**
 * @route   GET /api/v1/ai-tutor/chats/:chatId
 * @desc    Get a specific chat with its messages
 * @access  Private (Subscription required)
 */
router.get('/chats/:chatId',
  aiTutorLimiter,
  aiTutorController.getChatById
);

/**
 * @route   PATCH /api/v1/ai-tutor/chats/:chatId
 * @desc    Update a chat (title, pin, archive, etc.)
 * @access  Private (Subscription required)
 */
router.patch('/chats/:chatId',
  aiTutorLimiter,
  validateRequest(updateChatSchema),
  aiTutorController.updateChat
);

/**
 * @route   DELETE /api/v1/ai-tutor/chats/:chatId
 * @desc    Delete a chat and all its messages
 * @access  Private (Subscription required)
 */
router.delete('/chats/:chatId',
  aiTutorLimiter,
  aiTutorController.deleteChat
);

export default router;
