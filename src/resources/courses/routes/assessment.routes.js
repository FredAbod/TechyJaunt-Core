import express from "express";
import assessmentController from "../controllers/assessment.controller.js";
import { isAuthenticated } from "../../../middleware/isAuthenticated.js";
import { validateRequest } from "../../../middleware/validation.middleware.js";
import { checkRole } from "../../../middleware/rbac.js";
import {
  createAssessmentSchema,
  updateAssessmentSchema,
  submitAssessmentSchema
} from "../../../utils/validation/course.validation.js";

const router = express.Router();

// Student routes - Get and submit assessments
router.get(
  "/modules/:moduleId/assessment",
  isAuthenticated,
  assessmentController.getAssessmentByModule
);

router.post(
  "/assessments/:assessmentId/submit",
  isAuthenticated,
  validateRequest(submitAssessmentSchema),
  assessmentController.submitAssessment
);

router.get(
  "/assessments/:assessmentId/attempts",
  isAuthenticated,
  assessmentController.getAssessmentAttempts
);

// Admin/Tutor routes - Create, update, delete assessments
router.post(
  "/assessments",
  isAuthenticated,
  checkRole(["admin", "tutor"]),
  validateRequest(createAssessmentSchema),
  assessmentController.createAssessment
);

router.get(
  "/courses/:courseId/assessments",
  isAuthenticated,
  checkRole(["admin", "tutor"]),
  assessmentController.getCourseAssessments
);

router.get(
  "/assessments/:assessmentId/details",
  isAuthenticated,
  checkRole(["admin", "tutor"]),
  assessmentController.getAssessmentDetails
);

router.put(
  "/assessments/:assessmentId",
  isAuthenticated,
  checkRole(["admin", "tutor"]),
  validateRequest(updateAssessmentSchema),
  assessmentController.updateAssessment
);

router.delete(
  "/assessments/:assessmentId",
  isAuthenticated,
  checkRole(["admin", "tutor"]),
  assessmentController.deleteAssessment
);

export default router;
