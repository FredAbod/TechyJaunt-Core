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

// Student routes - Progress tracking
router.put(
  "/courses/:courseId/lessons/:lessonId/progress",
  isAuthenticated,
  validateRequest(updateVideoProgressSchema),
  progressController.updateVideoProgress
);

router.get(
  "/courses/:courseId/progress",
  isAuthenticated,
  progressController.getUserProgress
);

router.get(
  "/courses/:courseId/modules/:moduleId/access",
  isAuthenticated,
  progressController.getModuleAccess
);

router.post(
  "/courses/:courseId/initialize",
  isAuthenticated,
  validateRequest(initializeProgressSchema),
  progressController.initializeProgress
);

router.get(
  "/dashboard",
  isAuthenticated,
  progressController.getDashboard
);

// Admin/Tutor routes - Progress management and statistics
router.get(
  "/courses/:courseId/stats",
  isAuthenticated,
  roleBasedAccess(["admin", "tutor", "super admin"]),
  progressController.getCourseProgressStats
);

router.put(
  "/courses/:courseId/users/:userId/reset",
  isAuthenticated,
  roleBasedAccess(["admin", "super admin"]),
  progressController.resetUserProgress
);

// Sync progress with course structure
router.post(
  "/courses/:courseId/sync",
  isAuthenticated,
  progressController.syncProgress
);

router.post(
  "/courses/:courseId/add-lessons",
  isAuthenticated,
  progressController.addMissingLessons
);

// Debug endpoint to list all lessons for a course
router.get(
  "/courses/:courseId/lessons",
  isAuthenticated,
  progressController.getCourseLessons
);

export default router;
