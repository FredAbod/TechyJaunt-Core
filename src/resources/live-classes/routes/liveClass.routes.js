import express from "express";
import rateLimit from "express-rate-limit";
import {
  scheduleLiveClass,
  getInstructorClasses,
  getStudentClasses,
  startLiveClass,
  endLiveClass,
  joinLiveClass,
  leaveLiveClass,
  addComment,
  getClassComments,
  updateLiveClass,
  cancelLiveClass
} from "../controllers/liveClass.controller.js";
import { isAuthenticated } from "../../../middleware/isAuthenticated.js";
import { validateRequest } from "../../../middleware/validation.middleware.js";
import {
  scheduleLiveClassSchema,
  updateLiveClassSchema,
  addCommentSchema
} from "../../../utils/validation/liveClass.validation.js";

const router = express.Router();

// Rate limiting for live class endpoints
const liveClassLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  message: {
    error: "Too many live class requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const commentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 comments per minute
  message: {
    error: "Too many comments, please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin/Tutor routes
router.post(
  "/",
  liveClassLimiter,
  isAuthenticated,
  validateRequest(scheduleLiveClassSchema),
  scheduleLiveClass
);

router.get(
  "/instructor",
  liveClassLimiter,
  isAuthenticated,
  getInstructorClasses
);

router.put(
  "/:classId/start",
  liveClassLimiter,
  isAuthenticated,
  startLiveClass
);

router.put(
  "/:classId/end",
  liveClassLimiter,
  isAuthenticated,
  endLiveClass
);

router.put(
  "/:classId",
  liveClassLimiter,
  isAuthenticated,
  validateRequest(updateLiveClassSchema),
  updateLiveClass
);

router.delete(
  "/:classId",
  liveClassLimiter,
  isAuthenticated,
  cancelLiveClass
);

// Student routes
router.get(
  "/",
  liveClassLimiter,
  isAuthenticated,
  getStudentClasses
);

router.post(
  "/:classId/join",
  liveClassLimiter,
  isAuthenticated,
  joinLiveClass
);

router.post(
  "/:classId/leave",
  liveClassLimiter,
  isAuthenticated,
  leaveLiveClass
);

// Comment routes
router.post(
  "/:classId/comments",
  commentLimiter,
  isAuthenticated,
  validateRequest(addCommentSchema),
  addComment
);

router.get(
  "/:classId/comments",
  liveClassLimiter,
  isAuthenticated,
  getClassComments
);

export default router;
