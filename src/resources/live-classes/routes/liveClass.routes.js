import express from "express";
import rateLimit from "express-rate-limit";
import {
  scheduleLiveClass,
  getInstructorClasses,
  getStudentClasses,
  startLiveClass,
  endLiveClass,
  joinLiveClass,
  leaveLiveClass,
  addComment,
  getClassComments,
  updateLiveClass,
  cancelLiveClass
} from "../controllers/liveClass.controller.js";
import { isAuthenticated } from "../../../middleware/isAuthenticated.js";
import { validateRequest } from "../../../middleware/validation.middleware.js";
import {
  scheduleLiveClassSchema,
  updateLiveClassSchema,
  addCommentSchema
} from "../../../utils/validation/liveClass.validation.js";

const router = express.Router();

// Rate limiting for live class endpoints
const liveClassLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  message: {
    error: "Too many live class requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const commentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 comments per minute
  message: {
    error: "Too many comments, please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== ADMIN/TUTOR ROUTES ====================

/**
 * @swagger
 * /api/v1/live-classes:
 *   post:
 *     tags:
 *       - Live Classes
 *     summary: Schedule a new live class
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               courseId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: integer
 *                 description: Duration in minutes
 *               meetingLink:
 *                 type: string
 *     responses:
 *       201:
 *         description: Live class scheduled successfully
 */
router.post(
  "/",
  liveClassLimiter,
  isAuthenticated,
  validateRequest(scheduleLiveClassSchema),
  scheduleLiveClass
);

/**
 * @swagger
 * /api/v1/live-classes/instructor:
 *   get:
 *     tags:
 *       - Live Classes
 *     summary: Get instructor's live classes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ["scheduled", "ongoing", "completed", "cancelled"]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of instructor's live classes
 */
router.get(
  "/instructor",
  liveClassLimiter,
  isAuthenticated,
  getInstructorClasses
);

/**
 * @swagger
 * /api/v1/live-classes/{classId}/start:
 *   put:
 *     tags:
 *       - Live Classes
 *     summary: Start a live class
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Live class started successfully
 */
router.put(
  "/:classId/start",
  liveClassLimiter,
  isAuthenticated,
  startLiveClass
);

/**
 * @swagger
 * /api/v1/live-classes/{classId}/end:
 *   put:
 *     tags:
 *       - Live Classes
 *     summary: End a live class
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Live class ended successfully
 */
router.put(
  "/:classId/end",
  liveClassLimiter,
  isAuthenticated,
  endLiveClass
);

/**
 * @swagger
 * /api/v1/live-classes/{classId}:
 *   put:
 *     tags:
 *       - Live Classes
 *     summary: Update live class details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
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
 *               description:
 *                 type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Live class updated successfully
 */
router.put(
  "/:classId",
  liveClassLimiter,
  isAuthenticated,
  validateRequest(updateLiveClassSchema),
  updateLiveClass
);

/**
 * @swagger
 * /api/v1/live-classes/{classId}:
 *   delete:
 *     tags:
 *       - Live Classes
 *     summary: Cancel live class
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Live class cancelled successfully
 */
router.delete(
  "/:classId",
  liveClassLimiter,
  isAuthenticated,
  cancelLiveClass
);

// ==================== STUDENT ROUTES ====================

/**
 * @swagger
 * /api/v1/live-classes:
 *   get:
 *     tags:
 *       - Live Classes
 *     summary: Get student's live classes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ["scheduled", "ongoing", "completed", "cancelled"]
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of enrolled live classes
 */
router.get(
  "/",
  liveClassLimiter,
  isAuthenticated,
  getStudentClasses
);

/**
 * @swagger
 * /api/v1/live-classes/{classId}/join:
 *   post:
 *     tags:
 *       - Live Classes
 *     summary: Join a live class
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully joined live class
 */
router.post(
  "/:classId/join",
  liveClassLimiter,
  isAuthenticated,
  joinLiveClass
);

/**
 * @swagger
 * /api/v1/live-classes/{classId}/leave:
 *   post:
 *     tags:
 *       - Live Classes
 *     summary: Leave a live class
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully left live class
 */
router.post(
  "/:classId/leave",
  liveClassLimiter,
  isAuthenticated,
  leaveLiveClass
);

// ==================== COMMENT ROUTES ====================

/**
 * @swagger
 * /api/v1/live-classes/{classId}/comments:
 *   post:
 *     tags:
 *       - Live Classes
 *     summary: Add comment to live class
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
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
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added successfully
 */
router.post(
  "/:classId/comments",
  commentLimiter,
  isAuthenticated,
  validateRequest(addCommentSchema),
  addComment
);

/**
 * @swagger
 * /api/v1/live-classes/{classId}/comments:
 *   get:
 *     tags:
 *       - Live Classes
 *     summary: Get live class comments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of class comments
 */
router.get(
  "/:classId/comments",
  liveClassLimiter,
  isAuthenticated,
  getClassComments
);

export default router;
