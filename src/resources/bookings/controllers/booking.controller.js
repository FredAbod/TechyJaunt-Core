import bookingService from '../services/booking.service.js';
import { successResMsg, errorResMsg } from '../../../utils/lib/response.js';
import logger from '../../../utils/log/logger.js';

/**
 * Set tutor availability
 */
const setAvailability = async (req, res) => {
  try {
    const tutorId = req.user.id;
    const { timeSlots, timezone } = req.body;

    const availability = await bookingService.setTutorAvailability(tutorId, timeSlots, timezone);    logger.info(`Tutor ${tutorId} set availability`);
    return successResMsg(res, 200, {
      message: 'Availability set successfully',
      data: availability
    });  } catch (error) {
    logger.error('Error setting availability:', error);
    return errorResMsg(res, error.statusCode || 500, error.message);
  }
};

/**
 * Get tutor availability
 */
const getAvailability = async (req, res) => {
  try {
    const { tutorId } = req.params;
    const { date, week } = req.query;

    const availability = await bookingService.getTutorAvailability(tutorId, { date, week });

    return successResMsg(res, {
      message: 'Availability retrieved successfully',
      data: availability
    });
  } catch (error) {
    logger.error('Error getting availability:', error);
    return errorResMsg(res, error.message, error.statusCode || 500);
  }
};

/**
 * Book a session
 */
const bookSession = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { tutorId, date, startTime, endTime, courseId, notes } = req.body;

    const booking = await bookingService.bookSession({
      studentId,
      tutorId,
      date,
      startTime,
      endTime,
      courseId,
      notes
    });

    logger.info(`Student ${studentId} booked session with tutor ${tutorId}`);
    return successResMsg(res, {
      message: 'Session booked successfully',
      data: booking
    }, 201);
  } catch (error) {
    logger.error('Error booking session:', error);
    return errorResMsg(res, error.message, error.statusCode || 500);
  }
};

/**
 * Get user bookings (student or tutor)
 */
const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10, type } = req.query;

    const bookings = await bookingService.getUserBookings(userId, {
      status,
      page: parseInt(page),
      limit: parseInt(limit),
      type // 'student' or 'tutor'
    });

    return successResMsg(res, {
      message: 'Bookings retrieved successfully',
      data: bookings
    });
  } catch (error) {
    logger.error('Error getting user bookings:', error);
    return errorResMsg(res, error.message, error.statusCode || 500);
  }
};

/**
 * Get specific booking details
 */
const getBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const booking = await bookingService.getBookingDetails(bookingId, userId);

    return successResMsg(res, {
      message: 'Booking details retrieved successfully',
      data: booking
    });
  } catch (error) {
    logger.error('Error getting booking details:', error);
    return errorResMsg(res, error.message, error.statusCode || 500);
  }
};

/**
 * Update booking status
 */
const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, reason } = req.body;
    const userId = req.user.id;

    const booking = await bookingService.updateBookingStatus(bookingId, status, userId, reason);

    logger.info(`Booking ${bookingId} status updated to ${status} by user ${userId}`);
    return successResMsg(res, {
      message: 'Booking status updated successfully',
      data: booking
    });
  } catch (error) {
    logger.error('Error updating booking status:', error);
    return errorResMsg(res, error.message, error.statusCode || 500);
  }
};

/**
 * Cancel booking
 */
const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const booking = await bookingService.cancelBooking(bookingId, userId, reason);

    logger.info(`Booking ${bookingId} cancelled by user ${userId}`);
    return successResMsg(res, {
      message: 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    logger.error('Error cancelling booking:', error);
    return errorResMsg(res, error.message, error.statusCode || 500);
  }
};

/**
 * Reschedule booking
 */
const rescheduleBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { date, startTime, endTime, reason } = req.body;
    const userId = req.user.id;

    const booking = await bookingService.rescheduleBooking(bookingId, {
      date,
      startTime,
      endTime,
      reason,
      userId
    });

    logger.info(`Booking ${bookingId} rescheduled by user ${userId}`);
    return successResMsg(res, {
      message: 'Booking rescheduled successfully',
      data: booking
    });
  } catch (error) {
    logger.error('Error rescheduling booking:', error);
    return errorResMsg(res, error.message, error.statusCode || 500);
  }
};

/**
 * Complete session
 */
const completeSession = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { notes } = req.body;
    const tutorId = req.user.id;

    const booking = await bookingService.completeSession(bookingId, tutorId, notes);

    logger.info(`Session ${bookingId} completed by tutor ${tutorId}`);
    return successResMsg(res, {
      message: 'Session completed successfully',
      data: booking
    });
  } catch (error) {
    logger.error('Error completing session:', error);
    return errorResMsg(res, error.message, error.statusCode || 500);
  }
};

/**
 * Submit session feedback
 */
const submitFeedback = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { rating, feedback } = req.body;
    const userId = req.user.id;

    const result = await bookingService.submitSessionFeedback(bookingId, userId, rating, feedback);

    logger.info(`Feedback submitted for session ${bookingId} by user ${userId}`);
    return successResMsg(res, {
      message: 'Feedback submitted successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error submitting feedback:', error);
    return errorResMsg(res, error.message, error.statusCode || 500);
  }
};

/**
 * Get session statistics (for tutors)
 */
const getSessionStats = async (req, res) => {
  try {
    const tutorId = req.user.id;
    const { period = 'month' } = req.query;

    const stats = await bookingService.getSessionStats(tutorId, period);

    return successResMsg(res, {
      message: 'Session statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    logger.error('Error getting session stats:', error);
    return errorResMsg(res, error.message, error.statusCode || 500);
  }
};

export {
  setAvailability,
  getAvailability,
  bookSession,
  getUserBookings,
  getBookingDetails,
  updateBookingStatus,
  cancelBooking,
  rescheduleBooking,
  completeSession,
  submitFeedback,
  getSessionStats
};
