import express from "express";
import rateLimit from "express-rate-limit";
import {
  uploadVideoClass,
  getVideoClasses,
  getVideoClass,
  updateVideoClass,
  deleteVideoClass,
  uploadClassResource,
  getClassResources,
  downloadResource,
  deleteClassResource,
  getInstructorVideoClasses
} from "../controllers/prerecordedContent.controller.js";
import { isAuthenticated } from "../../../middleware/isAuthenticated.js";
import { validateRequest } from "../../../middleware/validation.middleware.js";
import { 
  videoUpload, 
  generalFileUpload, 
  handleMulterError 
} from "../../../middleware/upload.middleware.js";
import {
  createPrerecordedClassSchema,
  updatePrerecordedClassSchema,
  uploadResourceSchema
} from "../../../utils/validation/course.validation.js";

const router = express.Router();

// Rate limiting for upload endpoints
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 uploads per hour
  message: {
    error: "Too many upload requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const downloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // limit each IP to 100 downloads per hour
  message: {
    error: "Too many download requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== VIDEO CLASS ROUTES ====================

/**
 * @swagger
 * /api/v1/prerecorded/video-classes:
 *   post:
 *     tags:
 *       - Pre-recorded Content
 *     summary: Upload a new video class
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               courseId:
 *                 type: string
 *               video:
 *                 type: string
 *                 format: binary
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Video class uploaded successfully
 */
router.post(
  "/video-classes",
  uploadLimiter,
  isAuthenticated,
  videoUpload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  validateRequest(createPrerecordedClassSchema),
  uploadVideoClass
);

/**
 * @swagger
 * /api/v1/prerecorded/courses/{courseId}/video-classes:
 *   get:
 *     tags:
 *       - Pre-recorded Content
 *     summary: Get video classes for a course
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
 *         description: List of video classes
 */
router.get(
  "/courses/:courseId/video-classes",
  isAuthenticated,
  getVideoClasses
);

/**
 * @swagger
 * /api/v1/prerecorded/video-classes/{classId}:
 *   get:
 *     tags:
 *       - Pre-recorded Content
 *     summary: Get video class by ID
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
 *         description: Video class details
 */
router.get(
  "/video-classes/:classId",
  isAuthenticated,
  getVideoClass
);

/**
 * @swagger
 * /api/v1/prerecorded/video-classes/{classId}:
 *   put:
 *     tags:
 *       - Pre-recorded Content
 *     summary: Update video class
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
 *     responses:
 *       200:
 *         description: Video class updated successfully
 */
router.put(
  "/video-classes/:classId",
  isAuthenticated,
  validateRequest(updatePrerecordedClassSchema),
  updateVideoClass
);

/**
 * @swagger
 * /api/v1/prerecorded/video-classes/{classId}:
 *   delete:
 *     tags:
 *       - Pre-recorded Content
 *     summary: Delete video class
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
 *         description: Video class deleted successfully
 */
router.delete(
  "/video-classes/:classId",
  isAuthenticated,
  deleteVideoClass
);

/**
 * @swagger
 * /api/v1/prerecorded/instructor/video-classes:
 *   get:
 *     tags:
 *       - Pre-recorded Content
 *     summary: Get instructor's video classes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of instructor's video classes
 */
router.get(
  "/instructor/video-classes",
  isAuthenticated,
  getInstructorVideoClasses
);

// ==================== CLASS RESOURCE ROUTES ====================

/**
 * @swagger
 * /api/v1/prerecorded/resources:
 *   post:
 *     tags:
 *       - Pre-recorded Content
 *     summary: Upload class resource (PDF, notes, etc)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               classId:
 *                 type: string
 *               name:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Resource uploaded successfully
 */
router.post(
  "/resources",
  uploadLimiter,
  isAuthenticated,
  generalFileUpload.single('file'),
  validateRequest(uploadResourceSchema),
  uploadClassResource
);

/**
 * @swagger
 * /api/v1/prerecorded/classes/{classId}/resources:
 *   get:
 *     tags:
 *       - Pre-recorded Content
 *     summary: Get resources for a video class
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
 *         description: List of class resources
 */
router.get(
  "/classes/:classId/resources",
  isAuthenticated,
  getClassResources
);

/**
 * @swagger
 * /api/v1/prerecorded/resources/{resourceId}/download:
 *   get:
 *     tags:
 *       - Pre-recorded Content
 *     summary: Download class resource
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resource file download
 */
router.get(
  "/resources/:resourceId/download",
  downloadLimiter,
  isAuthenticated,
  downloadResource
);

/**
 * @swagger
 * /api/v1/prerecorded/resources/{resourceId}:
 *   delete:
 *     tags:
 *       - Pre-recorded Content
 *     summary: Delete class resource
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resource deleted successfully
 */
router.delete(
  "/resources/:resourceId",
  isAuthenticated,
  deleteClassResource
);

// Public routes (no authentication required)
router.get(
  "/public/courses/:courseId/video-classes",
  getVideoClasses
);

router.get(
  "/public/video-classes/:classId",
  getVideoClass
);

// Error handling middleware for multer
router.use(handleMulterError);

export default router;
