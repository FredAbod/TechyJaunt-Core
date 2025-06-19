import TutorAvailability from "../models/tutorAvailability.js";
import BookingSession from "../models/bookingSession.js";
import User from "../../user/models/user.js";
import Course from "../../courses/models/course.js";
import { v4 as uuidv4 } from "uuid";

class BookingService {
  // Helper function to generate Jitsi meeting URL
  generateMeetingUrl() {
    const roomId = `booking_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    return {
      platform: "jitsi",
      meetingUrl: `https://meet.jit.si/${roomId}`,
      meetingId: roomId,
      password: Math.random().toString(36).substring(2, 8)
    };
  }

  // Helper function to calculate end time
  calculateEndTime(startTime, duration) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }

  // Helper function to check time conflicts
  isTimeConflict(start1, end1, start2, end2) {
    const toMinutes = (time) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const start1Minutes = toMinutes(start1);
    const end1Minutes = toMinutes(end1);
    const start2Minutes = toMinutes(start2);
    const end2Minutes = toMinutes(end2);

    return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
  }

  // Set tutor availability
  async setAvailability(availabilityData, tutorId) {
    try {
      // Verify tutor permissions
      const tutor = await User.findById(tutorId);
      if (!tutor || !["admin", "tutor", "super admin"].includes(tutor.role)) {
        throw new Error("Only tutors and admins can set availability");
      }

      // If course specific, verify the course exists and tutor has access
      if (availabilityData.courseSpecific) {
        const course = await Course.findById(availabilityData.courseSpecific);
        if (!course) {
          throw new Error("Course not found");
        }
        if (course.instructor.toString() !== tutorId && tutor.role !== "super admin") {
          throw new Error("You can only set availability for your own courses");
        }
      }

      // Check for existing availability on the same day
      const existingAvailability = await TutorAvailability.findOne({
        tutorId,
        dayOfWeek: availabilityData.dayOfWeek,
        isRecurring: availabilityData.isRecurring,
        courseSpecific: availabilityData.courseSpecific || null
      });

      if (existingAvailability) {
        // Update existing availability
        existingAvailability.timeSlots = availabilityData.timeSlots;
        existingAvailability.timezone = availabilityData.timezone || existingAvailability.timezone;
        existingAvailability.hourlyRate = availabilityData.hourlyRate || existingAvailability.hourlyRate;
        existingAvailability.description = availabilityData.description || existingAvailability.description;
        existingAvailability.specificDate = availabilityData.specificDate || existingAvailability.specificDate;
        
        await existingAvailability.save();
        return existingAvailability;
      } else {
        // Create new availability
        const availability = new TutorAvailability({
          ...availabilityData,
          tutorId
        });

        await availability.save();
        return await TutorAvailability.findById(availability._id)
          .populate('tutorId', 'firstName lastName email')
          .populate('courseSpecific', 'title');
      }
    } catch (error) {
      throw error;
    }
  }

  // Get tutor's availability
  async getTutorAvailability(tutorId, filters = {}) {
    try {
      const query = {
        tutorId,
        isActive: true
      };

      if (filters.dayOfWeek) {
        query.dayOfWeek = filters.dayOfWeek;
      }

      if (filters.courseId) {
        query.$or = [
          { courseSpecific: filters.courseId },
          { courseSpecific: null }
        ];
      }

      const availability = await TutorAvailability.find(query)
        .populate('tutorId', 'firstName lastName email')
        .populate('courseSpecific', 'title')
        .sort({ dayOfWeek: 1 });

      return availability;
    } catch (error) {
      throw error;
    }
  }

  // Get available tutors for a specific time/course
  async getAvailableTutors(filters = {}) {
    try {
      const query = {
        isActive: true
      };

      if (filters.dayOfWeek) {
        query.dayOfWeek = filters.dayOfWeek;
      }

      if (filters.courseId) {
        query.$or = [
          { courseSpecific: filters.courseId },
          { courseSpecific: null }
        ];
      }

      const availabilities = await TutorAvailability.find(query)
        .populate('tutorId', 'firstName lastName email profilePic')
        .populate('courseSpecific', 'title');

      // Group by tutor
      const tutorMap = new Map();
      availabilities.forEach(availability => {
        const tutorId = availability.tutorId._id.toString();
        if (!tutorMap.has(tutorId)) {
          tutorMap.set(tutorId, {
            tutor: availability.tutorId,
            availabilities: []
          });
        }
        tutorMap.get(tutorId).availabilities.push(availability);
      });

      return Array.from(tutorMap.values());
    } catch (error) {
      throw error;
    }
  }

  // Book a session
  async bookSession(bookingData, studentId) {
    try {
      // Verify student exists
      const student = await User.findById(studentId);
      if (!student) {
        throw new Error("Student not found");
      }

      // Verify tutor exists and has correct role
      const tutor = await User.findById(bookingData.tutorId);
      if (!tutor || !["admin", "tutor", "super admin"].includes(tutor.role)) {
        throw new Error("Invalid tutor selected");
      }

      // Calculate end time
      const endTime = this.calculateEndTime(bookingData.startTime, bookingData.duration);

      // Check if tutor is available at the requested time
      const dayOfWeek = new Date(bookingData.sessionDate).toLocaleDateString('en-US', { weekday: 'lowercase' });
      
      const availability = await TutorAvailability.findOne({
        tutorId: bookingData.tutorId,
        dayOfWeek,
        isActive: true,
        $or: [
          { courseSpecific: bookingData.courseId },
          { courseSpecific: null }
        ]
      });

      if (!availability) {
        throw new Error("Tutor is not available on this day");
      }

      // Check if the requested time slot is available
      const availableSlot = availability.timeSlots.find(slot => {
        return slot.isAvailable &&
               slot.currentBookings < slot.maxBookings &&
               this.isTimeConflict(bookingData.startTime, endTime, slot.startTime, slot.endTime);
      });

      if (!availableSlot) {
        throw new Error("Tutor is not available at the requested time");
      }

      // Check for existing bookings at the same time
      const existingBooking = await BookingSession.findOne({
        tutorId: bookingData.tutorId,
        sessionDate: bookingData.sessionDate,
        status: { $in: ["pending", "confirmed"] },
        $or: [
          {
            $and: [
              { startTime: { $lte: bookingData.startTime } },
              { endTime: { $gt: bookingData.startTime } }
            ]
          },
          {
            $and: [
              { startTime: { $lt: endTime } },
              { endTime: { $gte: endTime } }
            ]
          }
        ]
      });

      if (existingBooking) {
        throw new Error("Time slot is already booked");
      }

      // Generate meeting details
      const meetingDetails = this.generateMeetingUrl();

      // Create booking session
      const booking = new BookingSession({
        studentId,
        tutorId: bookingData.tutorId,
        courseId: bookingData.courseId,
        sessionDate: bookingData.sessionDate,
        startTime: bookingData.startTime,
        endTime,
        duration: bookingData.duration,
        timezone: bookingData.timezone,
        sessionType: bookingData.sessionType,
        topics: bookingData.topics,
        studentNotes: bookingData.studentNotes,
        meetingDetails,
        pricing: {
          amount: availability.hourlyRate.amount * (bookingData.duration / 60),
          currency: availability.hourlyRate.currency,
          paymentStatus: availability.hourlyRate.amount > 0 ? "pending" : "free"
        }
      });

      await booking.save();

      // Update availability slot booking count
      availableSlot.currentBookings += 1;
      await availability.save();

      return await BookingSession.findById(booking._id)
        .populate('studentId', 'firstName lastName email')
        .populate('tutorId', 'firstName lastName email')
        .populate('courseId', 'title');

    } catch (error) {
      throw error;
    }
  }

  // Get user's bookings (student or tutor)
  async getUserBookings(userId, role = "student", status = null) {
    try {
      const query = role === "student" ? { studentId: userId } : { tutorId: userId };
      
      if (status) {
        query.status = status;
      }

      const bookings = await BookingSession.find(query)
        .populate('studentId', 'firstName lastName email')
        .populate('tutorId', 'firstName lastName email')
        .populate('courseId', 'title')
        .sort({ sessionDate: -1, startTime: -1 });

      return bookings;
    } catch (error) {
      throw error;
    }
  }

  // Update booking status
  async updateBookingStatus(bookingId, status, userId, notes = {}) {
    try {
      const booking = await BookingSession.findById(bookingId);
      
      if (!booking) {
        throw new Error("Booking not found");
      }

      // Check permissions
      const isStudent = booking.studentId.toString() === userId;
      const isTutor = booking.tutorId.toString() === userId;
      
      if (!isStudent && !isTutor) {
        const user = await User.findById(userId);
        if (!user || user.role !== "super admin") {
          throw new Error("Access denied");
        }
      }

      // Update booking
      booking.status = status;
      
      if (notes.tutorNotes && isTutor) {
        booking.tutorNotes = notes.tutorNotes;
      }
      
      if (notes.sessionNotes && isTutor) {
        booking.sessionNotes = notes.sessionNotes;
      }

      if (notes.cancellationReason) {
        booking.cancellationReason = notes.cancellationReason;
        booking.cancelledBy = userId;
        booking.cancelledAt = new Date();
      }

      if (status === "confirmed") {
        booking.confirmedAt = new Date();
      }

      if (status === "completed") {
        booking.completedAt = new Date();
      }

      await booking.save();

      // If cancelled, update availability slot
      if (status === "cancelled") {
        const dayOfWeek = new Date(booking.sessionDate).toLocaleDateString('en-US', { weekday: 'lowercase' });
        const availability = await TutorAvailability.findOne({
          tutorId: booking.tutorId,
          dayOfWeek,
          isActive: true
        });

        if (availability) {
          const slot = availability.timeSlots.find(slot => 
            this.isTimeConflict(booking.startTime, booking.endTime, slot.startTime, slot.endTime)
          );
          if (slot && slot.currentBookings > 0) {
            slot.currentBookings -= 1;
            await availability.save();
          }
        }
      }

      return await BookingSession.findById(bookingId)
        .populate('studentId', 'firstName lastName email')
        .populate('tutorId', 'firstName lastName email')
        .populate('courseId', 'title');

    } catch (error) {
      throw error;
    }
  }

  // Add session feedback
  async addSessionFeedback(bookingId, userId, feedbackData) {
    try {
      const booking = await BookingSession.findById(bookingId);
      
      if (!booking) {
        throw new Error("Booking not found");
      }

      if (booking.status !== "completed") {
        throw new Error("Can only provide feedback for completed sessions");
      }

      const isStudent = booking.studentId.toString() === userId;
      const isTutor = booking.tutorId.toString() === userId;
      
      if (!isStudent && !isTutor) {
        throw new Error("Access denied");
      }

      // Update feedback
      if (isStudent) {
        booking.feedback.studentRating = feedbackData.rating;
        booking.feedback.studentComment = feedbackData.comment;
      } else {
        booking.feedback.tutorRating = feedbackData.rating;
        booking.feedback.tutorComment = feedbackData.comment;
      }

      await booking.save();

      return booking.feedback;
    } catch (error) {
      throw error;
    }
  }

  // Delete availability
  async deleteAvailability(availabilityId, tutorId) {
    try {
      const availability = await TutorAvailability.findById(availabilityId);
      
      if (!availability) {
        throw new Error("Availability not found");
      }

      const tutor = await User.findById(tutorId);
      if (availability.tutorId.toString() !== tutorId && tutor.role !== "super admin") {
        throw new Error("You can only delete your own availability");
      }

      // Check if there are pending or confirmed bookings
      const hasBookings = await BookingSession.findOne({
        tutorId: availability.tutorId,
        sessionDate: { $gte: new Date() },
        status: { $in: ["pending", "confirmed"] }
      });

      if (hasBookings) {
        throw new Error("Cannot delete availability with existing bookings");
      }

      await TutorAvailability.findByIdAndDelete(availabilityId);

      return { message: "Availability deleted successfully" };
    } catch (error) {
      throw error;
    }
  }

  // Get booking statistics for tutor
  async getTutorStats(tutorId) {
    try {
      const stats = await BookingSession.aggregate([
        { $match: { tutorId: new mongoose.Types.ObjectId(tutorId) } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalEarnings: { $sum: "$pricing.amount" }
          }
        }
      ]);

      const totalBookings = await BookingSession.countDocuments({ tutorId });
      const averageRating = await BookingSession.aggregate([
        { $match: { tutorId: new mongoose.Types.ObjectId(tutorId), "feedback.studentRating": { $exists: true } } },
        { $group: { _id: null, avgRating: { $avg: "$feedback.studentRating" } } }
      ]);

      return {
        totalBookings,
        bookingsByStatus: stats,
        averageRating: averageRating[0]?.avgRating || 0
      };
    } catch (error) {
      throw error;
    }
  }
}

export default new BookingService();
