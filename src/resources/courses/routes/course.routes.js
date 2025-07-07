import express from "express";
import rateLimit from "express-rate-limit";
import {
  createCourse,
  updateCourse,
  deleteCourse,
  addCurriculum,
  addModule,
  addLesson,
  getAllCourses,
  getAllCoursesAdmin,
  publishCourse,
  getCourseById,
  enrollInCourse,
  getCourseProgress,
  markLessonComplete,
  getUserDashboard,
} from "../controllers/course.controller.js";
import { isAuthenticated } from "../../../middleware/isAuthenticated.js";
import { validateRequest } from "../../../middleware/validation.middleware.js";
import {
  createCourseSchema,
  createModuleSchema,
  createLessonSchema,
  enrollCourseSchema,
  completeLessonSchema,
} from "../../../utils/validation/course.validation.js";
import roleBasedAccess from "../../../middleware/rbac.js";
import { checkCoursePayment } from "../../../middleware/checkCoursePayment.js";

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

// Public routes
router.get("/", courseLimiter, getAllCourses);
router.get("/:courseId", courseLimiter, getCourseById);

// Protected user routes
router.post(
  "/enroll",
  courseLimiter,
  isAuthenticated,
  validateRequest(enrollCourseSchema),
  checkCoursePayment,
  enrollInCourse
);
router.get("/progress/:courseId", courseLimiter, isAuthenticated, getCourseProgress);
router.post("/complete-lesson", courseLimiter, isAuthenticated, validateRequest(completeLessonSchema), markLessonComplete);
router.get("/user/dashboard", courseLimiter, isAuthenticated, getUserDashboard);

// Admin/Tutor routes
router.get("/admin/all", adminLimiter, isAuthenticated, roleBasedAccess(["admin", "super admin", "tutor"]), getAllCoursesAdmin);
router.post("/", adminLimiter, isAuthenticated, validateRequest(createCourseSchema), createCourse);
router.put("/:courseId", adminLimiter, isAuthenticated, validateRequest(createCourseSchema), updateCourse);
router.put("/:courseId/publish", adminLimiter, isAuthenticated, roleBasedAccess(["admin", "super admin", "tutor"]), publishCourse);
router.delete("/:courseId", adminLimiter, isAuthenticated, deleteCourse);
router.post("/:courseId/curriculum", adminLimiter, isAuthenticated, addCurriculum);
router.post("/modules", adminLimiter, isAuthenticated, validateRequest(createModuleSchema), addModule);
router.post("/lessons", adminLimiter, isAuthenticated, validateRequest(createLessonSchema), addLesson);

export default router;
