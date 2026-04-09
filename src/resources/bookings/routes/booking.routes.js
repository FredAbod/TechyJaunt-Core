import express from 'express';
import * as bookingController from '../controllers/booking.controller.js';
import { isAuthenticated } from '../../../middleware/isAuthenticated.js';
import roleBasedAccess from '../../../middleware/rbac.js';
import { checkFeatureAccess } from '../../../middleware/checkSubscriptionAccess.js';
import { validateRequest } from '../../../middleware/validation.middleware.js';
import {
  setAvailabilitySchema,
  bookSessionSchema,
  bookSessionBySlotSchema,
  updateBookingSchema,
  sessionFeedbackSchema,
  rescheduleBookingSchema
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
  max: 10, // increased limit to allow multiple students to book the same session
  message: 'Too many booking attempts, please try again later.'
});

const router = express.Router();

// ==================== TUTOR AVAILABILITY ROUTES ====================

/**
 * @swagger
 * /api/v1/bookings/availability:
 *   post:
 *     tags:
 *       - Bookings
 *     summary: Set tutor availability
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dayOfWeek:
 *                 type: integer
 *                 description: 0-6 (Monday-Sunday)
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *               sessionDuration:
 *                 type: integer
 *                 description: Duration in minutes
 *     responses:
 *       201:
 *         description: Availability set successfully
 */
router.post('/availability',
  bookingLimiter,
  isAuthenticated,
  roleBasedAccess(['tutor', 'admin', 'super admin']),
  validateRequest(setAvailabilitySchema),
  bookingController.setAvailability
);

/**
 * @swagger
 * /api/v1/bookings/availability/{tutorId}:
 *   get:
 *     tags:
 *       - Bookings
 *     summary: Get tutor availability
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
 *         description: Tutor availability schedule
 */
router.get('/availability/:tutorId',
  bookingLimiter,
  isAuthenticated,
  bookingController.getAvailability
);

/**
 * @swagger
 * /api/v1/bookings/slots/available:
 *   get:
 *     tags:
 *       - Bookings
 *     summary: Get available session slots
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tutorId
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Available time slots for booking
 */
router.get('/slots/available',
  bookingLimiter,
  isAuthenticated,
  roleBasedAccess(['tutor', 'admin', 'super admin', 'student', 'user']),
  bookingController.getAvailableSessionSlots
);

// ==================== SESSION BOOKING ROUTES ====================

/**
 * @swagger
 * /api/v1/bookings/sessions:
 *   post:
 *     tags:
 *       - Bookings
 *     summary: Book a mentorship session
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tutorId:
 *                 type: string
 *               courseId:
 *                 type: string
 *               sessionDate:
 *                 type: string
 *                 format: date-time
 *               topic:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Session booked successfully
 */
router.post('/sessions',
  strictBookingLimiter,
  isAuthenticated,
  roleBasedAccess(['student', 'admin', 'user', 'super admin', 'tutor']),
  checkFeatureAccess('mentorship', { courseIdBody: 'courseId' }),
  validateRequest(bookSessionSchema),
  bookingController.bookSession
);

/**
 * @swagger
 * /api/v1/bookings/sessions/by-slot:
 *   post:
 *     tags:
 *       - Bookings
 *     summary: Book session by available slot
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               slotId:
 *                 type: string
 *               courseId:
 *                 type: string
 *               topic:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Session booked from available slot
 */
router.post('/sessions/by-slot',
  strictBookingLimiter,
  isAuthenticated,
  roleBasedAccess(['student', 'admin', 'user', 'super admin', 'tutor']),
  checkFeatureAccess('mentorship', { courseIdBody: 'courseId' }),
  validateRequest(bookSessionBySlotSchema),
  bookingController.bookSessionBySlot
);

/**
 * @swagger
 * /api/v1/bookings/sessions:
 *   get:
 *     tags:
 *       - Bookings
 *     summary: Get user bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ["pending", "confirmed", "completed", "cancelled"]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of user bookings
 */
router.get('/sessions',
  bookingLimiter,
  isAuthenticated,
  bookingController.getUserBookings
);

/**
 * @swagger
 * /api/v1/bookings/sessions/{bookingId}:
 *   get:
 *     tags:
 *       - Bookings
 *     summary: Get booking details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking details with session information
 */
router.get('/sessions/:bookingId',
  bookingLimiter,
  isAuthenticated,
  bookingController.getBookingDetails
);

// ==================== SESSION MANAGEMENT ROUTES ====================

/**
 * @swagger
 * /api/v1/bookings/sessions/{bookingId}/status:
 *   patch:
 *     tags:
 *       - Bookings
 *     summary: Update booking status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
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
 *                 enum: ["confirmed", "cancelled", "completed"]
 *     responses:
 *       200:
 *         description: Booking status updated
 */
router.patch('/sessions/:bookingId/status',
  bookingLimiter,
  isAuthenticated,
  validateRequest(updateBookingSchema),
  bookingController.updateBookingStatus
);

/**
 * @swagger
 * /api/v1/bookings/sessions/{bookingId}/cancel:
 *   post:
 *     tags:
 *       - Bookings
 *     summary: Cancel a booking
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 */
router.post('/sessions/:bookingId/cancel',
  bookingLimiter,
  isAuthenticated,
  bookingController.cancelBooking
);

/**
 * @swagger
 * /api/v1/bookings/sessions/{bookingId}/reschedule:
 *   patch:
 *     tags:
 *       - Bookings
 *     summary: Reschedule a booking
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
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
 *               newDate:
 *                 type: string
 *                 format: date-time
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking rescheduled successfully
 */
router.patch('/sessions/:bookingId/reschedule',
  bookingLimiter,
  isAuthenticated,
  validateRequest(rescheduleBookingSchema),
  bookingController.rescheduleBooking
);

/**
 * @swagger
 * /api/v1/bookings/sessions/{bookingId}/complete:
 *   post:
 *     tags:
 *       - Bookings
 *     summary: Mark session as complete
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session marked as complete
 */
router.post('/sessions/:bookingId/complete',
  bookingLimiter,
  isAuthenticated,
  roleBasedAccess(['tutor', 'admin', 'super admin']),
  bookingController.completeSession
);

// ==================== FEEDBACK ROUTES ====================

/**
 * @swagger
 * /api/v1/bookings/sessions/{bookingId}/feedback:
 *   post:
 *     tags:
 *       - Bookings
 *     summary: Submit session feedback
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
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
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *               topicsDiscussed:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Feedback submitted successfully
 */
router.post('/sessions/:bookingId/feedback',
  bookingLimiter,
  isAuthenticated,
  validateRequest(sessionFeedbackSchema),
  bookingController.submitFeedback
);

// ==================== STATISTICS ROUTES ====================

/**
 * @swagger
 * /api/v1/bookings/stats:
 *   get:
 *     tags:
 *       - Bookings
 *     summary: Get session statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session statistics for tutor
 */
router.get('/stats',
  bookingLimiter,
  isAuthenticated,
  roleBasedAccess(['tutor', 'admin', 'super admin']),
  bookingController.getSessionStats
);

/**
 * @swagger
 * /api/v1/bookings/sessions/participants:
 *   get:
 *     tags:
 *       - Bookings
 *     summary: Get session participants
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of session participants
 */
router.get('/sessions/participants',
  bookingLimiter,
  isAuthenticated,
  roleBasedAccess(['tutor', 'admin']),
  bookingController.getSessionParticipants
);

router.patch('/sessions/:bookingId/reschedule',
  bookingLimiter,
  isAuthenticated,
  validateRequest(rescheduleBookingSchema),
  bookingController.rescheduleBooking
);

router.post('/sessions/:bookingId/complete',
  bookingLimiter,
  isAuthenticated,
  roleBasedAccess(['tutor', 'admin', 'super admin']),
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
  roleBasedAccess(['tutor', 'admin', 'super admin']),
  bookingController.getSessionStats
);

// Get session participants (for group sessions)
router.get('/sessions/participants',
  bookingLimiter,
  isAuthenticated,
  roleBasedAccess(['tutor', 'admin']),
  bookingController.getSessionParticipants
);

export default router;
