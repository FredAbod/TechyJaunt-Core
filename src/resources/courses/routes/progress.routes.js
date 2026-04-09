import express from "express";
import progressController from "../controllers/progress.controller.js";
import { isAuthenticated } from "../../../middleware/isAuthenticated.js";
import { validateRequest } from "../../../middleware/validation.middleware.js";
import roleBasedAccess from "../../../middleware/rbac.js";
import {
  updateVideoProgressSchema,
  initializeProgressSchema
} from "../../../utils/validation/course.validation.js";

const router = express.Router();

// ==================== STUDENT PROGRESS ROUTES ====================

/**
 * @swagger
 * /api/v1/progress/courses/{courseId}/lessons/{lessonId}/progress:
 *   put:
 *     tags:
 *       - Progress
 *     summary: Update video progress for a lesson
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: lessonId
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
 *               currentTime:
 *                 type: number
 *               duration:
 *                 type: number
 *               completed:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Progress updated successfully
 */
router.put(
  "/courses/:courseId/lessons/:lessonId/progress",
  isAuthenticated,
  validateRequest(updateVideoProgressSchema),
  progressController.updateVideoProgress
);

/**
 * @swagger
 * /api/v1/progress/courses/{courseId}/progress:
 *   get:
 *     tags:
 *       - Progress
 *     summary: Get user's progress in a course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User's course progress
 */
router.get(
  "/courses/:courseId/progress",
  isAuthenticated,
  progressController.getUserProgress
);

/**
 * @swagger
 * /api/v1/progress/courses/{courseId}/modules/{moduleId}/access:
 *   get:
 *     tags:
 *       - Progress
 *     summary: Check module access based on progress
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Module access status
 */
router.get(
  "/courses/:courseId/modules/:moduleId/access",
  isAuthenticated,
  progressController.getModuleAccess
);

/**
 * @swagger
 * /api/v1/progress/courses/{courseId}/initialize:
 *   post:
 *     tags:
 *       - Progress
 *     summary: Initialize progress for enrolled course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Progress initialized successfully
 */
router.post(
  "/courses/:courseId/initialize",
  isAuthenticated,
  validateRequest(initializeProgressSchema),
  progressController.initializeProgress
);

/**
 * @swagger
 * /api/v1/progress/dashboard:
 *   get:
 *     tags:
 *       - Progress
 *     summary: Get user's progress dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard with all enrolled courses and progress
 */
router.get(
  "/dashboard",
  isAuthenticated,
  progressController.getDashboard
);

// ==================== ADMIN/TUTOR ROUTES ====================

/**
 * @swagger
 * /api/v1/progress/courses/{courseId}/stats:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get course progress statistics  
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course progress statistics
 */
router.get(
  "/courses/:courseId/stats",
  isAuthenticated,
  roleBasedAccess(["admin", "tutor", "super admin"]),
  progressController.getCourseProgressStats
);

/**
 * @swagger
 * /api/v1/progress/courses/{courseId}/users/{userId}/reset:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Reset user's course progress
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progress reset successfully
 */
router.put(
  "/courses/:courseId/users/:userId/reset",
  isAuthenticated,
  roleBasedAccess(["admin", "super admin"]),
  progressController.resetUserProgress
);

/**
 * @swagger
 * /api/v1/progress/courses/{courseId}/sync:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Sync progress with course structure
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progress synced successfully
 */
router.post(
  "/courses/:courseId/sync",
  isAuthenticated,
  progressController.syncProgress
);

/**
 * @swagger
 * /api/v1/progress/courses/{courseId}/add-lessons:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Add missing lessons to existing progress
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Missing lessons added successfully
 */
router.post(
  "/courses/:courseId/add-lessons",
  isAuthenticated,
  progressController.addMissingLessons
);

/**
 * @swagger
 * /api/v1/progress/courses/{courseId}/lessons:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get all lessons for a course (debug endpoint)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of course lessons
 */
router.get(
  "/courses/:courseId/lessons",
  isAuthenticated,
  progressController.getCourseLessons
);

export default router;
