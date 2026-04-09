import express from "express";
import assessmentController from "../controllers/assessment.controller.js";
import { isAuthenticated } from "../../../middleware/isAuthenticated.js";
import { validateRequest } from "../../../middleware/validation.middleware.js";
import roleBasedAccess from "../../../middleware/rbac.js";
import {
  createAssessmentSchema,
  updateAssessmentSchema,
  submitAssessmentSchema
} from "../../../utils/validation/course.validation.js";

const router = express.Router();

// ==================== STUDENT ROUTES ====================

/**
 * @swagger
 * /api/v1/assessments/modules/{moduleId}/assessment:
 *   get:
 *     tags:
 *       - Assessments
 *     summary: Get assessment for a module
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assessment for the module
 */
router.get(
  "/modules/:moduleId/assessment",
  isAuthenticated,
  assessmentController.getAssessmentByModule
);

/**
 * @swagger
 * /api/v1/assessments/assessments/{assessmentId}/submit:
 *   post:
 *     tags:
 *       - Assessments
 *     summary: Submit answers for an assessment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assessmentId
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
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Assessment submitted successfully
 */
router.post(
  "/assessments/:assessmentId/submit",
  isAuthenticated,
  validateRequest(submitAssessmentSchema),
  assessmentController.submitAssessment
);

/**
 * @swagger
 * /api/v1/assessments/assessments/{assessmentId}/attempts:
 *   get:
 *     tags:
 *       - Assessments
 *     summary: Get assessment attempts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of assessment attempts with scores
 */
router.get(
  "/assessments/:assessmentId/attempts",
  isAuthenticated,
  assessmentController.getAssessmentAttempts
);

// ==================== ADMIN/TUTOR ROUTES ====================

/**
 * @swagger
 * /api/v1/assessments/assessments:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Create a new assessment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               moduleId:
 *                 type: string
 *               title:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: ["quiz", "exam", "assignment"]
 *               questions:
 *                 type: array
 *     responses:
 *       201:
 *         description: Assessment created successfully
 */
router.post(
  "/assessments",
  isAuthenticated,
  roleBasedAccess(["admin", "tutor", "super admin"]),
  validateRequest(createAssessmentSchema),
  assessmentController.createAssessment
);

/**
 * @swagger
 * /api/v1/assessments/courses/{courseId}/assessments:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get all assessments for a course
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
 *         description: List of course assessments
 */
router.get(
  "/courses/:courseId/assessments",
  isAuthenticated,
  roleBasedAccess(["admin", "tutor", "super admin"]),
  assessmentController.getCourseAssessments
);

/**
 * @swagger
 * /api/v1/assessments/assessments/{assessmentId}/details:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get assessment details with submissions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assessment details and all submissions
 */
router.get(
  "/assessments/:assessmentId/details",
  isAuthenticated,
  roleBasedAccess(["admin", "tutor", "super admin"]),
  assessmentController.getAssessmentDetails
);

/**
 * @swagger
 * /api/v1/assessments/assessments/{assessmentId}:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Update assessment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assessmentId
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
 *       200:
 *         description: Assessment updated successfully
 */
router.put(
  "/assessments/:assessmentId",
  isAuthenticated,
  roleBasedAccess(["admin", "tutor", "super admin"]),
  validateRequest(updateAssessmentSchema),
  assessmentController.updateAssessment
);

/**
 * @swagger
 * /api/v1/assessments/assessments/{assessmentId}:
 *   delete:
 *     tags:
 *       - Admin
 *     summary: Delete assessment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assessment deleted successfully
 */
router.delete(
  "/assessments/:assessmentId",
  isAuthenticated,
  roleBasedAccess(["admin", "tutor", "super admin"]),
  assessmentController.deleteAssessment
);

export default router;
