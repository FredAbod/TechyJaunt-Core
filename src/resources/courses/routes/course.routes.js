// ...existing imports...
import express from "express";
import rateLimit from "express-rate-limit";
import {
  createCourse,
  updateCourse,
  deleteCourse,
  addCurriculum,
  addModule,
  updateModule,
  addLesson,
  updateLesson,
  deleteLesson,
  deleteModule,
  getAllCourses,
  getAllCoursesAdmin,
  publishCourse,
  getCourseById,
  enrollInCourse,
  getCourseProgress,
  markLessonComplete,
  getUserDashboard,
  uploadCourseBrochure,
  downloadCourseBrochure,
} from "../controllers/course.controller.js";
import { isAuthenticated } from "../../../middleware/isAuthenticated.js";
import { validateRequest } from "../../../middleware/validation.middleware.js";
import {
  createCourseSchema,
  createModuleSchema,
  updateModuleSchema,
  createLessonSchema,
  enrollCourseSchema,
  completeLessonSchema,
} from "../../../utils/validation/course.validation.js";
import roleBasedAccess from "../../../middleware/rbac.js";
import { checkCoursePayment } from "../../../middleware/checkCoursePayment.js";
import {
  documentUpload,
  imageUpload,
  handleMulterError,
} from "../../../middleware/upload.middleware.js";
import { validateMultipartCourse } from "../../../middleware/validateMultipartCourse.js";

const router = express.Router();

// Rate limiting
const courseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { error: "Too many course requests, please try again later." },
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many admin requests, please try again later." },
});

// ==================== PUBLIC ROUTES ====================

/**
 * @swagger
 * /api/v1/courses:
 *   get:
 *     tags:
 *       - Courses
 *     summary: Get all courses (public)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of all available courses
 */
router.get("/", courseLimiter, getAllCourses);

/**
 * @swagger
 * /api/v1/courses/{courseId}:
 *   get:
 *     tags:
 *       - Courses
 *     summary: Get course by ID
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course details with modules and lessons
 */
router.get("/:courseId", courseLimiter, getCourseById);

/**
 * @swagger
 * /api/v1/courses/{courseId}/brochure/download:
 *   get:
 *     tags:
 *       - Courses
 *     summary: Download course brochure
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course brochure PDF
 */
router.get(
  "/:courseId/brochure/download",
  courseLimiter,
  downloadCourseBrochure,
);

// ==================== PROTECTED USER ROUTES ====================

/**
 * @swagger
 * /api/v1/courses/enroll:
 *   post:
 *     tags:
 *       - Course Enrollment
 *     summary: Enroll in a course
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
 *               paymentMethod:
 *                 type: string
 *     responses:
 *       201:
 *         description: Successfully enrolled in course
 */
router.post(
  "/enroll",
  courseLimiter,
  isAuthenticated,
  validateRequest(enrollCourseSchema),
  checkCoursePayment,
  enrollInCourse,
);

/**
 * @swagger
 * /api/v1/courses/progress/{courseId}:
 *   get:
 *     tags:
 *       - Course Progress
 *     summary: Get course progress for enrolled student
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
 *         description: Course progress with completed lessons and percentage
 */
router.get(
  "/progress/:courseId",
  courseLimiter,
  isAuthenticated,
  getCourseProgress,
);

/**
 * @swagger
 * /api/v1/courses/complete-lesson:
 *   post:
 *     tags:
 *       - Course Progress
 *     summary: Mark lesson as complete
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
 *               lessonId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lesson marked as complete
 */
router.post(
  "/complete-lesson",
  courseLimiter,
  isAuthenticated,
  validateRequest(completeLessonSchema),
  markLessonComplete,
);

/**
 * @swagger
 * /api/v1/courses/user/dashboard:
 *   get:
 *     tags:
 *       - Course Progress
 *     summary: Get user course dashboard with enrolled courses
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User dashboard with enrolled courses and progress
 */
router.get("/user/dashboard", courseLimiter, isAuthenticated, getUserDashboard);

// ==================== ADMIN/TUTOR ROUTES ====================

/**
 * @swagger
 * /api/v1/courses/admin/all:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get all courses (admin view)
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
 *         description: List of all courses for admin management
 */
router.get(
  "/admin/all",
  adminLimiter,
  isAuthenticated,
  roleBasedAccess(["admin", "super admin", "tutor"]),
  getAllCoursesAdmin,
);

/**
 * @swagger
 * /api/v1/courses:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Create new course
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
 *               category:
 *                 type: string
 *               level:
 *                 type: string
 *                 enum: ["beginner", "intermediate", "advanced"]
 *               price:
 *                 type: number
 *               duration:
 *                 type: number
 *               image:
 *                 type: string
 *                 format: binary
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Course created successfully
 */
router.post(
  "/",
  adminLimiter,
  isAuthenticated,
  imageUpload.fields([
    { name: "image", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  handleMulterError,
  validateMultipartCourse,
  createCourse,
);

/**
 * @swagger
 * /api/v1/courses/{courseId}:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Update course
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               level:
 *                 type: string
 *               price:
 *                 type: number
 *               duration:
 *                 type: number
 *               image:
 *                 type: string
 *                 format: binary
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Course updated successfully
 */
router.put(
  "/:courseId",
  adminLimiter,
  isAuthenticated,
  imageUpload.fields([
    { name: "image", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  handleMulterError,
  validateMultipartCourse,
  updateCourse,
);

/**
 * @swagger
 * /api/v1/courses/{courseId}/publish:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Publish/unpublish course
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
 *             properties:
 *               status:
 *                 type: string
 *                 enum: ["published", "draft"]
 *     responses:
 *       200:
 *         description: Course status updated
 */
router.put(
  "/:courseId/publish",
  adminLimiter,
  isAuthenticated,
  roleBasedAccess(["admin", "super admin", "tutor"]),
  publishCourse,
);

/**
 * @swagger
 * /api/v1/courses/{courseId}:
 *   delete:
 *     tags:
 *       - Admin
 *     summary: Delete course
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
 *         description: Course deleted successfully
 */
router.delete("/:courseId", adminLimiter, isAuthenticated, deleteCourse);

/**
 * @swagger
 * /api/v1/courses/{courseId}/curriculum:
 *   post:
 *     tags:
 *       - Course Curriculum
 *     summary: Add curriculum to course
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Curriculum added successfully
 */
router.post(
  "/:courseId/curriculum",
  adminLimiter,
  isAuthenticated,
  addCurriculum,
);

/**
 * @swagger
 * /api/v1/courses/modules:
 *   post:
 *     tags:
 *       - Course Modules
 *     summary: Add module to course
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
 *               order:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Module created successfully
 */
router.post(
  "/modules",
  adminLimiter,
  isAuthenticated,
  validateRequest(createModuleSchema),
  addModule,
);

/**
 * @swagger
 * /api/v1/courses/modules/{moduleId}:
 *   put:
 *     tags:
 *       - Course Modules
 *     summary: Update course module
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
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
 *               order:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Module updated successfully
 */
router.put(
  "/modules/:moduleId",
  adminLimiter,
  isAuthenticated,
  validateRequest(updateModuleSchema),
  roleBasedAccess(["admin", "super admin", "tutor"]),
  updateModule,
);

/**
 * @swagger
 * /api/v1/courses/modules/{moduleId}:
 *   delete:
 *     tags:
 *       - Course Modules
 *     summary: Delete course module
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
 *         description: Module deleted successfully
 */
router.delete(
  "/modules/:moduleId",
  adminLimiter,
  isAuthenticated,
  deleteModule,
);

/**
 * @swagger
 * /api/v1/courses/lessons:
 *   post:
 *     tags:
 *       - Course Lessons
 *     summary: Add lesson to module
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
 *               description:
 *                 type: string
 *               videoUrl:
 *                 type: string
 *               duration:
 *                 type: number
 *               order:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Lesson created successfully
 */
router.post(
  "/lessons",
  adminLimiter,
  isAuthenticated,
  validateRequest(createLessonSchema),
  addLesson,
);

/**
 * @swagger
 * /api/v1/courses/lessons/{lessonId}:
 *   put:
 *     tags:
 *       - Course Lessons
 *     summary: Update course lesson
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               videoUrl:
 *                 type: string
 *               duration:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lesson updated successfully
 */
router.put("/lessons/:lessonId", adminLimiter, isAuthenticated, updateLesson);

/**
 * @swagger
 * /api/v1/courses/lessons/{lessonId}:
 *   delete:
 *     tags:
 *       - Course Lessons
 *     summary: Delete course lesson
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lesson deleted successfully
 */
router.delete(
  "/lessons/:lessonId",
  adminLimiter,
  isAuthenticated,
  deleteLesson,
);

/**
 * @swagger
 * /api/v1/courses/{courseId}/brochure/upload:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Upload course brochure
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               brochure:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Brochure uploaded successfully
 */
router.post(
  "/:courseId/brochure/upload",
  adminLimiter,
  isAuthenticated,
  roleBasedAccess(["admin", "super admin", "tutor"]),
  documentUpload.single("brochure"),
  handleMulterError,
  uploadCourseBrochure,
);

export default router;
