import bookingService from "../services/booking.service.js";
import User from "../../user/models/user.js";
import { successResMsg, errorResMsg } from "../../../utils/lib/response.js";
import logger from "../../../utils/log/logger.js";

/**
 * Set tutor availability
 */
const setAvailability = async (req, res) => {
  try {
    const tutorId = req.user.userId;
    const availabilityData = req.body;

    const availability = await bookingService.setTutorAvailability(
      tutorId,
      availabilityData,
    );

    logger.info(`Tutor ${tutorId} set availability`);
    return successResMsg(res, 200, {
      message: "Availability set successfully",
      data: availability,
    });
  } catch (error) {
    logger.error("Error setting availability:", error);
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

    const availability = await bookingService.getTutorAvailability(tutorId, {
      date,
      week,
    });

    return successResMsg(res, 200, {
      message: "Availability retrieved successfully",
      data: availability,
    });
  } catch (error) {
    logger.error("Error getting availability:", error);
    return errorResMsg(res, error.statusCode || 500, error.message);
  }
};

/**
 * Book a session
 */
const bookSession = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { tutorId, date, startTime, endTime, courseId, notes } = req.body;

    const booking = await bookingService.bookSession({
      studentId,
      tutorId,
      date,
      startTime,
      endTime,
      courseId,
      notes,
    });

    logger.info(`Student ${studentId} booked session with tutor ${tutorId}`);
    return successResMsg(res, 201, {
      message: "Session booked successfully",
      data: booking,
    });
  } catch (error) {
    logger.error("Error booking session:", error);
    return errorResMsg(res, error.statusCode || 500, error.message);
  }
};

/**
 * Get available session slots (easier for users to book)
 */
const getAvailableSessionSlots = async (req, res) => {
  try {
    const { tutorId, courseId, dayOfWeek } = req.query;
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;

    logger.info(
      `Getting available slots - requesterId: ${requesterId}, tutorId: ${tutorId || "all"}, courseId: ${courseId}, dayOfWeek: ${dayOfWeek}`,
    );

    // If no specific tutor is requested, get slots for all tutors with courses
    // If a specific tutor is requested, get slots for that tutor (must have courses)
    const slots = await bookingService.getAvailableSessionSlots(tutorId, {
      courseId,
      dayOfWeek,
      requesterId,
      requesterRole,
    });

    logger.info(`Found ${slots.length} available slots`);

    return successResMsg(res, 200, {
      message: "Available session slots retrieved successfully",
      data: slots,
    });
  } catch (error) {
    logger.error("Error getting available slots:", error);
    return errorResMsg(res, error.statusCode || 500, error.message);
  }
};

/**
 * Book a session by slot (easier method)
 */
const bookSessionBySlot = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const bookingData = req.body;

    const booking = await bookingService.bookSessionBySlot(
      studentId,
      bookingData,
    );

    logger.info(`Student ${studentId} booked session by slot`);
    return successResMsg(res, 201, {
      message: "Session booked successfully",
      data: booking,
    });
  } catch (error) {
    logger.error("Error booking session by slot:", error);
    return errorResMsg(res, error.statusCode || 500, error.message);
  }
};

/**
 * Get user bookings (student or tutor)
 */
const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.userId; // Changed from req.user.id to req.user.userId
    const { status, page = 1, limit = 10, type } = req.query;

    logger.info(`Getting bookings for user: ${userId}, type: ${type}`);

    const bookings = await bookingService.getUserBookings(userId, {
      status,
      page: parseInt(page),
      limit: parseInt(limit),
      type, // 'student' or 'tutor'
    });

    return successResMsg(res, 200, {
      message: "Bookings retrieved successfully",
      data: bookings,
    });
  } catch (error) {
    logger.error("Error getting user bookings:", error);
    return errorResMsg(res, error.statusCode || 500, error.message);
  }
};

/**
 * Get specific booking details
 */
const getBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.userId;

    const booking = await bookingService.getBookingDetails(bookingId, userId);

    return successResMsg(res, 200, {
      message: "Booking details retrieved successfully",
      data: booking,
    });
  } catch (error) {
    logger.error("Error getting booking details:", error);
    return errorResMsg(res, error.statusCode || 500, error.message);
  }
};

/**
 * Update booking status
 */
const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, reason } = req.body;
    const userId = req.user.userId;

    const booking = await bookingService.updateBookingStatus(
      bookingId,
      status,
      userId,
      reason,
    );

    logger.info(
      `Booking ${bookingId} status updated to ${status} by user ${userId}`,
    );
    return successResMsg(res, 200, {
      message: "Booking status updated successfully",
      data: booking,
    });
  } catch (error) {
    logger.error("Error updating booking status:", error);
    return errorResMsg(res, error.statusCode || 500, error.message);
  }
};

/**
 * Cancel booking
 */
const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;

    const booking = await bookingService.cancelBooking(
      bookingId,
      userId,
      reason,
    );

    logger.info(`Booking ${bookingId} cancelled by user ${userId}`);
    return successResMsg(res, 200, {
      message: "Booking cancelled successfully",
      data: booking,
    });
  } catch (error) {
    logger.error("Error cancelling booking:", error);
    return errorResMsg(res, error.statusCode || 500, error.message);
  }
};

/**
 * Reschedule booking
 */
const rescheduleBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { sessionDate, startTime, endTime, duration, reason, timezone } =
      req.body;
    const userId = req.user.userId;

    // Calculate endTime if not provided but duration is provided
    let calculatedEndTime = endTime;
    if (!endTime && duration && startTime) {
      const [hours, minutes] = startTime.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes + duration;
      const endHours = Math.floor(totalMinutes / 60);
      const endMinutes = totalMinutes % 60;
      calculatedEndTime = `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
    }

    const booking = await bookingService.rescheduleBooking(bookingId, {
      date: sessionDate, // Map sessionDate to date for service
      startTime,
      endTime: calculatedEndTime,
      reason,
      userId,
    });

    logger.info(`Booking ${bookingId} rescheduled by user ${userId}`);
    return successResMsg(res, 200, {
      message: "Booking rescheduled successfully",
      data: booking,
    });
  } catch (error) {
    logger.error("Error rescheduling booking:", error);
    return errorResMsg(res, error.statusCode || 500, error.message);
  }
};

/**
 * Complete session
 */
const completeSession = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { notes } = req.body;
    const tutorId = req.user.userId;

    logger.info(
      `Attempting to complete session with bookingId: ${bookingId} by tutor: ${tutorId}`,
    );

    const booking = await bookingService.completeSession(
      bookingId,
      tutorId,
      notes,
    );

    logger.info(`Session ${bookingId} completed by tutor ${tutorId}`);
    return successResMsg(res, 200, {
      message: "Session completed successfully",
      data: booking,
    });
  } catch (error) {
    logger.error("Error completing session:", error);
    return errorResMsg(res, error.statusCode || 500, error.message);
  }
};

/**
 * Submit session feedback
 */
const submitFeedback = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { rating, feedback } = req.body;
    const userId = req.user.userId;

    const result = await bookingService.submitSessionFeedback(
      bookingId,
      userId,
      rating,
      feedback,
    );

    logger.info(
      `Feedback submitted for session ${bookingId} by user ${userId}`,
    );
    return successResMsg(res, 200, {
      message: "Feedback submitted successfully",
      data: result,
    });
  } catch (error) {
    logger.error("Error submitting feedback:", error);
    return errorResMsg(res, error.statusCode || 500, error.message);
  }
};

/**
 * Get session statistics (for tutors)
 */
const getSessionStats = async (req, res) => {
  try {
    const tutorId = req.user.userId;
    const { period = "month" } = req.query;

    const stats = await bookingService.getSessionStats(tutorId, period);

    return successResMsg(res, 200, {
      message: "Session statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    logger.error("Error getting session stats:", error);
    return errorResMsg(res, error.statusCode || 500, error.message);
  }
};

/**
 * Get session participants (for group sessions)
 */
const getSessionParticipants = async (req, res) => {
  try {
    const { tutorId, sessionDate, startTime, endTime } = req.query;
    const userId = req.user.userId;

    // Check if user is the tutor or admin
    const user = await User.findById(userId);
    if (tutorId !== userId && !["admin", "super admin"].includes(user.role)) {
      return errorResMsg(res, "Access denied", 403);
    }

    const participants = await bookingService.getSessionParticipants(
      tutorId,
      sessionDate,
      startTime,
      endTime,
    );

    return successResMsg(res, 200, {
      message: "Session participants retrieved successfully",
      data: participants,
    });
  } catch (error) {
    logger.error("Error getting session participants:", error);
    return errorResMsg(res, error.statusCode || 500, error.message);
  }
};

export {
  setAvailability,
  getAvailability,
  bookSession,
  getAvailableSessionSlots,
  bookSessionBySlot,
  getUserBookings,
  getBookingDetails,
  updateBookingStatus,
  cancelBooking,
  rescheduleBooking,
  completeSession,
  submitFeedback,
  getSessionStats,
  getSessionParticipants,
};
