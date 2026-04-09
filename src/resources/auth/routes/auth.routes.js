import express from "express";
import rateLimit from "express-rate-limit";
import { 
  registerUser, 
  verifyOtp, 
  resendOtp, 
  setPassword, 
  loginUser,
  forgotPassword,
  resetPassword,
  changePasswordRequest,
  verifyChangePasswordOtp
} from "../controllers/auth.controller.js";
import { validateRequest } from "../../../middleware/validation.middleware.js";
import { isAuthenticated } from "../../../middleware/isAuthenticated.js";
import {
  registerSchema,
  verifyOtpSchema,
  setPasswordSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyChangePasswordOtpSchema
} from "../../../utils/validation/auth.validation.js";

const router = express.Router();

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // limit each IP to 5 requests per windowMs
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // limit each IP to 3 OTP requests per minute
  message: {
    error: "Too many OTP requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication routes

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: OTP sent to email
 */
router.post("/register", authLimiter, validateRequest(registerSchema), registerUser);

/**
 * @swagger
 * /api/v1/auth/verify-otp:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Verify OTP and confirm email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email verified successfully
 */
router.post("/verify-otp", authLimiter, validateRequest(verifyOtpSchema), verifyOtp);

/**
 * @swagger
 * /api/v1/auth/resend-otp:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Resend OTP to email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP resent successfully
 */
router.post("/resend-otp", otpLimiter, validateRequest(registerSchema), resendOtp);

/**
 * @swagger
 * /api/v1/auth/set-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Set password after email verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *                 example: "Pass1234"
 *     responses:
 *       200:
 *         description: Password set successfully
 */
router.post("/set-password", authLimiter, validateRequest(setPasswordSchema), setPassword);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 */
router.post("/login", authLimiter, validateRequest(loginSchema), loginUser);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Request password reset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset token sent to email
 */
router.post("/forgot-password", authLimiter, validateRequest(forgotPasswordSchema), forgotPassword);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Reset password with token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               resetToken:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
router.post("/reset-password", authLimiter, validateRequest(resetPasswordSchema), resetPassword);

/**
 * @swagger
 * /api/v1/auth/change-password-request:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Request to change password (authenticated users)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent for password change verification
 */
router.post("/change-password-request", isAuthenticated, validateRequest(changePasswordSchema), changePasswordRequest);

/**
 * @swagger
 * /api/v1/auth/verify-change-password-otp:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Verify OTP and complete password change
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               otp:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.post("/verify-change-password-otp", isAuthenticated, validateRequest(verifyChangePasswordOtpSchema), verifyChangePasswordOtp);

export default router;
