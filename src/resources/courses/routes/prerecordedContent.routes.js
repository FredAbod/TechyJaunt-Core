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

// Video class routes (Admin/Tutor only)
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

router.get(
  "/courses/:courseId/video-classes",
  isAuthenticated,
  getVideoClasses
);

router.get(
  "/video-classes/:classId",
  isAuthenticated,
  getVideoClass
);

router.put(
  "/video-classes/:classId",
  isAuthenticated,
  validateRequest(updatePrerecordedClassSchema),
  updateVideoClass
);

router.delete(
  "/video-classes/:classId",
  isAuthenticated,
  deleteVideoClass
);

// Instructor routes
router.get(
  "/instructor/video-classes",
  isAuthenticated,
  getInstructorVideoClasses
);

// Class resource routes
router.post(
  "/resources",
  uploadLimiter,
  isAuthenticated,
  generalFileUpload.single('file'),
  validateRequest(uploadResourceSchema),
  uploadClassResource
);

router.get(
  "/classes/:classId/resources",
  isAuthenticated,
  getClassResources
);

router.get(
  "/resources/:resourceId/download",
  downloadLimiter,
  isAuthenticated,
  downloadResource
);

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
