import express from "express";
import progressController from "../controllers/progress.controller.js";
import { isAuthenticated } from "../../../middleware/isAuthenticated.js";
import { validateRequest } from "../../../middleware/validation.middleware.js";
import { checkRole } from "../../../middleware/rbac.js";
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
  checkRole(["admin", "tutor"]),
  progressController.getCourseProgressStats
);

router.put(
  "/courses/:courseId/users/:userId/reset",
  isAuthenticated,
  checkRole(["admin"]),
  progressController.resetUserProgress
);

export default router;
