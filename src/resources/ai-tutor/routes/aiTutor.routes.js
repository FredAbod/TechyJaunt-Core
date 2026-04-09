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
 * @swagger
 * /api/v1/ai-tutor/access:
 *   get:
 *     tags:
 *       - AI Tutor
 *     summary: Get AI Tutor access information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's AI Tutor access status and limits
 */
router.get('/access',
  aiTutorLimiter,
  aiTutorController.getAccessInfo
);

/**
 * @swagger
 * /api/v1/ai-tutor/status:
 *   get:
 *     tags:
 *       - AI Tutor
 *     summary: Get AI Tutor service status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI Tutor service operational status
 */
router.get('/status',
  aiTutorLimiter,
  aiTutorController.getServiceStatus
);

/**
 * @swagger
 * /api/v1/ai-tutor/explain:
 *   post:
 *     tags:
 *       - AI Tutor
 *     summary: Get AI explanation of a topic
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               topic:
 *                 type: string
 *               courseId:
 *                 type: string
 *               depth:
 *                 type: string
 *                 enum: ["beginner", "intermediate", "advanced"]
 *     responses:
 *       200:
 *         description: AI generated topic explanation
 */
router.post('/explain',
  aiGenerationLimiter,
  validateRequest(topicExplanationSchema),
  aiTutorController.getTopicExplanation
);

/**
 * @swagger
 * /api/v1/ai-tutor/study-plan:
 *   post:
 *     tags:
 *       - AI Tutor
 *     summary: Generate AI study plan for a topic
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               topic:
 *                 type: string
 *               courseId:
 *                 type: string
 *               duration:
 *                 type: integer
 *                 description: Study duration in minutes
 *     responses:
 *       200:
 *         description: AI generated study plan
 */
router.post('/study-plan',
  aiGenerationLimiter,
  validateRequest(studyPlanSchema),
  aiTutorController.generateStudyPlan
);

/**
 * @swagger
 * /api/v1/ai-tutor/question:
 *   post:
 *     tags:
 *       - AI Tutor
 *     summary: Ask AI Tutor a specific question
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *               courseId:
 *                 type: string
 *               context:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI answer to the question
 */
router.post('/question',
  aiGenerationLimiter,
  validateRequest(questionAnswerSchema),
  aiTutorController.answerQuestion
);

/**
 * @swagger
 * /api/v1/ai-tutor/exercises:
 *   post:
 *     tags:
 *       - AI Tutor
 *     summary: Generate practice exercises for a topic
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               topic:
 *                 type: string
 *               courseId:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 enum: ["easy", "medium", "hard"]
 *               count:
 *                 type: integer
 *     responses:
 *       200:
 *         description: AI generated practice exercises
 */
router.post('/exercises',
  aiGenerationLimiter,
  validateRequest(practiceExercisesSchema),
  aiTutorController.generatePracticeExercises
);

/**
 * @swagger
 * /api/v1/ai-tutor/history:
 *   get:
 *     tags:
 *       - AI Tutor
 *     summary: Get AI Tutor interaction history
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User's AI Tutor interaction history
 */
router.get('/history',
  aiTutorLimiter,
  aiTutorController.getUserHistory
);

/**
 * @swagger
 * /api/v1/ai-tutor/history/{historyId}:
 *   get:
 *     tags:
 *       - AI Tutor
 *     summary: Get detailed history item
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: historyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detailed history item with full content
 */
router.get('/history/:historyId',
  aiTutorLimiter,
  aiTutorController.getHistoryItem
);

/**
 * @swagger
 * /api/v1/ai-tutor/chats:
 *   post:
 *     tags:
 *       - AI Tutor Chats
 *     summary: Create a new chat session
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               courseId:
 *                 type: string
 *               topic:
 *                 type: string
 *     responses:
 *       201:
 *         description: Chat session created successfully
 */
router.post('/chats',
  aiTutorLimiter,
  validateRequest(createChatSchema),
  aiTutorController.createChat
);

/**
 * @swagger
 * /api/v1/ai-tutor/chats:
 *   get:
 *     tags:
 *       - AI Tutor Chats
 *     summary: Get all user chat sessions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of user's chat sessions
 */
router.get('/chats',
  aiTutorLimiter,
  aiTutorController.getUserChats
);

/**
 * @swagger
 * /api/v1/ai-tutor/chats/statistics:
 *   get:
 *     tags:
 *       - AI Tutor Chats
 *     summary: Get chat statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chat statistics including total chats, messages, etc
 */
router.get('/chats/statistics',
  aiTutorLimiter,
  aiTutorController.getChatStatistics
);

/**
 * @swagger
 * /api/v1/ai-tutor/chats/{chatId}:
 *   get:
 *     tags:
 *       - AI Tutor Chats
 *     summary: Get a specific chat with messages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat details with all messages
 */
router.get('/chats/:chatId',
  aiTutorLimiter,
  aiTutorController.getChatById
);

/**
 * @swagger
 * /api/v1/ai-tutor/chats/{chatId}:
 *   patch:
 *     tags:
 *       - AI Tutor Chats
 *     summary: Update chat (title, pin, archive, etc)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               isPinned:
 *                 type: boolean
 *               isArchived:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Chat updated successfully
 */
router.patch('/chats/:chatId',
  aiTutorLimiter,
  validateRequest(updateChatSchema),
  aiTutorController.updateChat
);

/**
 * @swagger
 * /api/v1/ai-tutor/chats/{chatId}:
 *   delete:
 *     tags:
 *       - AI Tutor Chats
 *     summary: Delete a chat and all its messages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat deleted successfully
 */
router.delete('/chats/:chatId',
  aiTutorLimiter,
  aiTutorController.deleteChat
);

export default router;
