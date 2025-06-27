import express from "express";
import rateLimit from "express-rate-limit";
import { 
  registerUser, 
  verifyOtp, 
  resendOtp, 
  setPassword, 
  loginUser,
  forgotPassword,
  resetPassword
} from "../controllers/auth.controller.js";
import { validateRequest } from "../../../middleware/validation.middleware.js";
import {
  registerSchema,
  verifyOtpSchema,
  setPasswordSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from "../../../utils/validation/auth.validation.js";

const router = express.Router();

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
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
router.post("/register", authLimiter, validateRequest(registerSchema), registerUser);
router.post("/verify-otp", authLimiter, validateRequest(verifyOtpSchema), verifyOtp);
router.post("/resend-otp", otpLimiter, validateRequest(registerSchema), resendOtp);
router.post("/set-password", authLimiter, validateRequest(setPasswordSchema), setPassword);
router.post("/login", authLimiter, validateRequest(loginSchema), loginUser);
router.post("/forgot-password", authLimiter, validateRequest(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", authLimiter, validateRequest(resetPasswordSchema), resetPassword);

export default router;
