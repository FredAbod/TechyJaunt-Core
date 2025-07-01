import express from "express";
import rateLimit from "express-rate-limit";
import { 
  addProfile, 
  getProfile, 
  updateProfile, 
  getDashboard,
  promoteUserRole,
  uploadProfilePicture,
  updateProfileWithPicture
} from "../controllers/user.controller.js";
import { isAuthenticated } from "../../../middleware/isAuthenticated.js";
import { validateRequest } from "../../../middleware/validation.middleware.js";
import { imageUpload } from "../../../middleware/upload.middleware.js";
import { profileSchema } from "../../../utils/validation/auth.validation.js";

const router = express.Router();

// Rate limiting for profile endpoints
const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 20 requests per windowMs
  message: {
    error: "Too many profile requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Profile routes (protected)
router.post("/profile", profileLimiter, isAuthenticated, validateRequest(profileSchema), addProfile);
router.get("/profile", profileLimiter, isAuthenticated, getProfile);
router.put("/profile", profileLimiter, isAuthenticated, validateRequest(profileSchema), updateProfile);
router.get("/dashboard", profileLimiter, isAuthenticated, getDashboard);

// Profile picture routes
router.post("/profile/picture", profileLimiter, isAuthenticated, imageUpload.single('profilePicture'), uploadProfilePicture);
router.put("/profile/with-picture", profileLimiter, isAuthenticated, imageUpload.single('profilePicture'), updateProfileWithPicture);

// Development endpoint to promote user role (remove in production)
router.post("/promote-role", profileLimiter, isAuthenticated, promoteUserRole);

export default router;
