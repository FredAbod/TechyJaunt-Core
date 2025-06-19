import express from 'express';
import * as bookingController from '../controllers/booking.controller.js';
import { isAuthenticated } from '../../../middleware/isAuthenticated.js';
import roleBasedAccess from '../../../middleware/rbac.js';
import { validateRequest } from '../../../middleware/validation.middleware.js';
import {
  setAvailabilitySchema,
  bookSessionSchema,
  updateBookingSchema,
  sessionFeedbackSchema
} from '../../../utils/validation/booking.validation.js';
import rateLimit from 'express-rate-limit';

// Rate limiting for booking operations
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: 'Too many booking requests, please try again later.'
});

const strictBookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 booking attempts per hour
  message: 'Too many booking attempts, please try again later.'
});

const router = express.Router();

// Tutor availability routes
router.post('/availability',
  bookingLimiter,
  isAuthenticated,
  roleBasedAccess(['tutor', 'admin']),
  validateRequest(setAvailabilitySchema),
  bookingController.setAvailability
);

router.get('/availability/:tutorId',
  bookingLimiter,
  isAuthenticated,
  bookingController.getAvailability
);

// Session booking routes
router.post('/sessions',
  strictBookingLimiter,
  isAuthenticated,
  roleBasedAccess(['student', 'admin']),
  validateRequest(bookSessionSchema),
  bookingController.bookSession
);

router.get('/sessions',
  bookingLimiter,
  isAuthenticated,
  bookingController.getUserBookings
);

router.get('/sessions/:bookingId',
  bookingLimiter,
  isAuthenticated,
  bookingController.getBookingDetails
);

// Session management routes
router.patch('/sessions/:bookingId/status',
  bookingLimiter,
  isAuthenticated,
  validateRequest(updateBookingSchema),
  bookingController.updateBookingStatus
);

router.post('/sessions/:bookingId/cancel',
  bookingLimiter,
  isAuthenticated,
  bookingController.cancelBooking
);

router.patch('/sessions/:bookingId/reschedule',
  bookingLimiter,
  isAuthenticated,
  validateRequest(bookSessionSchema),
  bookingController.rescheduleBooking
);

router.post('/sessions/:bookingId/complete',
  bookingLimiter,
  isAuthenticated,
  roleBasedAccess(['tutor', 'admin']),
  bookingController.completeSession
);

// Feedback routes
router.post('/sessions/:bookingId/feedback',
  bookingLimiter,
  isAuthenticated,
  validateRequest(sessionFeedbackSchema),
  bookingController.submitFeedback
);

// Statistics routes (for tutors)
router.get('/stats',
  bookingLimiter,
  isAuthenticated,
  roleBasedAccess(['tutor', 'admin']),
  bookingController.getSessionStats
);

export default router;
