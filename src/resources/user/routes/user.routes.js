import express from "express";
import rateLimit from "express-rate-limit";
import {
  addProfile,
  getProfile,
  updateProfile,
  getDashboard,
  inviteUser,
  promoteUserRole,
  uploadProfilePicture,
  updateProfileWithPicture,
  getAllStudents,
  getStudentById,
  getAllTutors,
  updateTutor,
  deleteTutor,
} from "../controllers/user.controller.js";
import { isAuthenticated } from "../../../middleware/isAuthenticated.js";
import roleBasedAccess from "../../../middleware/rbac.js";
import { validateRequest } from "../../../middleware/validation.middleware.js";
import { imageUpload } from "../../../middleware/upload.middleware.js";
import { profileSchema } from "../../../utils/validation/auth.validation.js";
import { inviteSchema } from "../../../utils/validation/auth.validation.js";

const router = express.Router();

// Rate limiting for profile endpoints
const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    error: "Too many profile requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Profile routes (protected)

/**
 * @swagger
 * /api/v1/user/profile:
 *   post:
 *     tags:
 *       - User Profile
 *     summary: Create user profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *               placeOfBirth:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile created successfully
 */
router.post(
  "/profile",
  profileLimiter,
  isAuthenticated,
  validateRequest(profileSchema),
  addProfile,
);

/**
 * @swagger
 * /api/v1/user/profile:
 *   get:
 *     tags:
 *       - User Profile
 *     summary: Get user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 */
router.get("/profile", profileLimiter, isAuthenticated, getProfile);

/**
 * @swagger
 * /api/v1/user/profile:
 *   put:
 *     tags:
 *       - User Profile
 *     summary: Update user profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put(
  "/profile",
  profileLimiter,
  isAuthenticated,
  validateRequest(profileSchema),
  updateProfile,
);

/**
 * @swagger
 * /api/v1/user/dashboard:
 *   get:
 *     tags:
 *       - User Profile
 *     summary: Get user dashboard with courses and progress
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved with enrolled courses and statistics
 */
router.get("/dashboard", profileLimiter, isAuthenticated, getDashboard);

// Profile picture routes

/**
 * @swagger
 * /api/v1/user/profile/picture:
 *   post:
 *     tags:
 *       - User Profile
 *     summary: Upload profile picture
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile picture uploaded successfully
 */
router.post(
  "/profile/picture",
  profileLimiter,
  isAuthenticated,
  imageUpload.single("profilePicture"),
  uploadProfilePicture,
);

/**
 * @swagger
 * /api/v1/user/profile/with-picture:
 *   put:
 *     tags:
 *       - User Profile
 *     summary: Update profile with picture
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile with picture updated successfully
 */
router.put(
  "/profile/with-picture",
  profileLimiter,
  isAuthenticated,
  imageUpload.single("profilePicture"),
  updateProfileWithPicture,
);

/**
 * @swagger
 * /api/v1/user/promote-role:
 *   post:
 *     tags:
 *       - User Management
 *     summary: Promote user role (dev endpoint)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User role promoted
 */
router.post("/promote-role", profileLimiter, isAuthenticated, promoteUserRole);

// Admin routes

/**
 * @swagger
 * /api/v1/user/admin/students:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get all students
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
 *         description: List of all students
 */
router.get("/admin/students", profileLimiter, isAuthenticated, getAllStudents);

/**
 * @swagger
 * /api/v1/user/admin/students/{studentId}:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get student by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student details
 */
router.get(
  "/admin/students/:studentId",
  profileLimiter,
  isAuthenticated,
  getStudentById,
);

/**
 * @swagger
 * /api/v1/user/tutors:
 *   get:
 *     tags:
 *       - User
 *     summary: Get all tutors
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
 *         description: List of all tutors with their courses
 */
router.get("/tutors", profileLimiter, isAuthenticated, getAllTutors);

/**
 * @swagger
 * /api/v1/user/admin/tutors/{tutorId}:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Update tutor details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tutorId
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
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               about:
 *                 type: string
 *               headline:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: ["active", "inactive", "suspended"]
 *     responses:
 *       200:
 *         description: Tutor updated successfully
 */
router.put(
  "/admin/tutors/:tutorId",
  profileLimiter,
  isAuthenticated,
  roleBasedAccess(["admin", "super admin"]),
  updateTutor,
);

/**
 * @swagger
 * /api/v1/user/admin/tutors/{tutorId}:
 *   delete:
 *     tags:
 *       - Admin
 *     summary: Delete (deactivate) tutor
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tutorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tutor deleted successfully
 */
router.delete(
  "/admin/tutors/:tutorId",
  profileLimiter,
  isAuthenticated,
  roleBasedAccess(["admin", "super admin"]),
  deleteTutor,
);

/**
 * @swagger
 * /api/v1/user/admin/invite:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Invite new user (tutor, admin, or student)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: ["super admin", "admin", "tutor", "user"]
 *               courseId:
 *                 type: string
 *               about:
 *                 type: string
 *               headline:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: User invited successfully
 */
router.post(
  "/admin/invite",
  profileLimiter,
  isAuthenticated,
  imageUpload.single("image"),
  inviteUser,
);

export default router;
