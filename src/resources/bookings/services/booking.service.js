import TutorAvailability from "../models/tutorAvailability.js";
import BookingSession from "../models/bookingSession.js";
import User from "../../user/models/user.js";
import Course from "../../courses/models/course.js";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import {
  sendSessionBookingStudentEmail,
  sendSessionBookingTutorEmail,
  sendSessionBookingAdminEmail,
} from "../../../utils/email/email-sender.js";

class BookingService {
  // Helper function to generate Jitsi meeting URL
  generateMeetingUrl() {
    const roomId = `booking_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}`;
    return {
      platform: "jitsi",
      meetingUrl: `https://meet.jit.si/${roomId}`,
      meetingId: roomId,
      password: Math.random().toString(36).substring(2, 8),
    };
  }

  // Helper function to calculate end time
  calculateEndTime(startTime, duration) {
    const [hours, minutes] = startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMinutes
      .toString()
      .padStart(2, "0")}`;
  }

  // Helper function to check time conflicts
  isTimeConflict(start1, end1, start2, end2) {
    const toMinutes = (time) => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const start1Minutes = toMinutes(start1);
    const end1Minutes = toMinutes(end1);
    const start2Minutes = toMinutes(start2);
    const end2Minutes = toMinutes(end2);

    return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
  }

  // Set tutor availability (method name updated to match controller)
  async setTutorAvailability(tutorId, availabilityData) {
    try {
      // Verify tutor permissions
      const tutor = await User.findById(tutorId);
      if (!tutor || !["admin", "tutor", "super admin"].includes(tutor.role)) {
        throw new Error("Only tutors and admins can set availability");
      }

      // Validate and set defaults for availability data
      const processedData = {
        timeSlots: availabilityData.timeSlots.map((slot) => ({
          ...slot,
          maxBookings: slot.maxBookings || 5, // Default to 5 max bookings per slot
          currentBookings: slot.currentBookings || 0,
        })),
        timezone: availabilityData.timezone || "UTC",
        dayOfWeek:
          availabilityData.dayOfWeek ||
          new Date()
            .toLocaleDateString("en-US", { weekday: "long" })
            .toLowerCase(),
        isRecurring:
          availabilityData.isRecurring !== undefined
            ? availabilityData.isRecurring
            : true,
        isActive:
          availabilityData.isActive !== undefined
            ? availabilityData.isActive
            : true,
        description: availabilityData.description || "",
        courseSpecific: availabilityData.courseSpecific || null,
        hourlyRate: availabilityData.hourlyRate || null,
        specificDate: availabilityData.specificDate || null,
      };

      // If course specific, verify the course exists and tutor has access
      if (processedData.courseSpecific) {
        const course = await Course.findById(processedData.courseSpecific);
        if (!course) {
          throw new Error("Course not found");
        }
        if (
          course.instructor.toString() !== tutorId &&
          tutor.role !== "super admin"
        ) {
          throw new Error("You can only set availability for your own courses");
        }
      }

      // Check for existing availability on the same day
      const existingAvailability = await TutorAvailability.findOne({
        tutorId,
        dayOfWeek: processedData.dayOfWeek,
        isRecurring: processedData.isRecurring,
        courseSpecific: processedData.courseSpecific || null,
      });

      if (existingAvailability) {
        // Update existing availability
        existingAvailability.timeSlots = processedData.timeSlots;
        existingAvailability.timezone = processedData.timezone;
        existingAvailability.hourlyRate =
          processedData.hourlyRate || existingAvailability.hourlyRate;
        existingAvailability.description =
          processedData.description || existingAvailability.description;
        existingAvailability.specificDate =
          processedData.specificDate || existingAvailability.specificDate;
        existingAvailability.isActive = processedData.isActive;

        await existingAvailability.save();
        return existingAvailability;
      } else {
        // Create new availability
        const availability = new TutorAvailability({
          ...processedData,
          tutorId,
        });

        await availability.save();
        return await TutorAvailability.findById(availability._id)
          .populate("tutorId", "firstName lastName email")
          .populate("courseSpecific", "title");
      }
    } catch (error) {
      throw error;
    }
  }

  // Get available session slots with booking-friendly format
  async getAvailableSessionSlots(tutorId, filters = {}) {
    try {
      console.log("\n=== getAvailableSessionSlots START ===");
      console.log("Input parameters:", { tutorId, filters });

      const query = {
        tutorId,
        isActive: true,
      };

      if (filters.dayOfWeek) {
        query.dayOfWeek = filters.dayOfWeek;
      }

      if (filters.courseId) {
        query.$or = [
          { courseSpecific: filters.courseId },
          { courseSpecific: null },
        ];
      }

      console.log("Database query:", JSON.stringify(query, null, 2));

      const availabilities = await TutorAvailability.find(query)
        .populate("tutorId", "firstName lastName email")
        .populate("courseSpecific", "title")
        .sort({ dayOfWeek: 1 });

      console.log("Found availabilities:", availabilities.length);
      console.log(
        "Availabilities data:",
        JSON.stringify(availabilities, null, 2)
      );

      // Format slots for easy booking
      const sessionSlots = [];

      availabilities.forEach((availability, availIndex) => {
        console.log(`\nProcessing availability ${availIndex + 1}:`, {
          id: availability._id,
          dayOfWeek: availability.dayOfWeek,
          timeSlots: availability.timeSlots.length,
        });

        availability.timeSlots.forEach((slot, index) => {
          console.log(`  Processing slot ${index + 1}:`, {
            isAvailable: slot.isAvailable,
            currentBookings: slot.currentBookings,
            maxBookings: slot.maxBookings,
            startTime: slot.startTime,
            endTime: slot.endTime,
          });

          if (
            slot.isAvailable &&
            slot.currentBookings < Math.min(slot.maxBookings, 5)
          ) {
            console.log(
              `    Slot ${index + 1} is available, generating dates...`
            );

            // Generate future dates for this day of week (next 4 weeks)
            const today = new Date();
            const targetDay = [
              "sunday",
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
            ].indexOf(availability.dayOfWeek.toLowerCase());

            console.log(
              `    Today: ${
                today.toISOString().split("T")[0]
              }, Target day: ${targetDay} (${availability.dayOfWeek})`
            );

            for (let week = 0; week < 4; week++) {
              const sessionDate = new Date(today);

              // Calculate days to add to get to the target day
              let daysToAdd = targetDay - today.getDay();
              if (daysToAdd <= 0) {
                daysToAdd += 7; // Move to next week if target day has passed
              }
              daysToAdd += week * 7; // Add additional weeks

              sessionDate.setDate(today.getDate() + daysToAdd);

              console.log(
                `      Week ${week + 1}: ${
                  sessionDate.toISOString().split("T")[0]
                }, Days to add: ${daysToAdd}`
              );

              // Only include future dates (at least 1 day ahead)
              if (sessionDate > today) {
                console.log(
                  `        Date is in future, generating time slots...`
                );

                // Generate individual session slots within the time block
                const sessionDuration = slot.sessionDuration || 60;
                const timeSlots = this.generateTimeSlots(
                  slot.startTime,
                  slot.endTime,
                  sessionDuration
                );

                console.log(
                  `        Generated ${timeSlots.length} time slots with duration ${sessionDuration}min`
                );

                timeSlots.forEach((timeSlot, slotIndex) => {
                  const sessionSlot = {
                    sessionId: `${availability._id}_${index}_${slotIndex}_${
                      sessionDate.toISOString().split("T")[0]
                    }`,
                    availabilityId: availability._id,
                    slotIndex: index,
                    timeSlotIndex: slotIndex,
                    tutorId: availability.tutorId._id,
                    tutorName: `${availability.tutorId.firstName} ${availability.tutorId.lastName}`,
                    sessionDate: sessionDate.toISOString().split("T")[0],
                    dayOfWeek: availability.dayOfWeek,
                    startTime: timeSlot.startTime,
                    endTime: timeSlot.endTime,
                    duration: sessionDuration,
                    availableSlots:
                      Math.min(slot.maxBookings, 5) - slot.currentBookings,
                    totalSlots: Math.min(slot.maxBookings, 5),
                    pricing: availability.hourlyRate || {
                      amount: 0,
                      currency: "USD",
                    },
                    course: availability.courseSpecific,
                    timezone: availability.timezone,
                    description: availability.description,
                    blockStartTime: slot.startTime,
                    blockEndTime: slot.endTime,
                  };

                  sessionSlots.push(sessionSlot);
                  console.log(
                    `          Added slot: ${timeSlot.startTime}-${
                      timeSlot.endTime
                    } on ${sessionDate.toISOString().split("T")[0]}`
                  );
                });
              } else {
                console.log(
                  `        Date ${
                    sessionDate.toISOString().split("T")[0]
                  } is not in future, skipping...`
                );
              }
            }
          } else {
            console.log(`    Slot ${index + 1} is not available:`, {
              isAvailable: slot.isAvailable,
              currentBookings: slot.currentBookings,
              maxBookings: slot.maxBookings,
              availableSlots:
                Math.min(slot.maxBookings, 5) - slot.currentBookings,
            });
          }
        });
      });

      console.log(`\nTotal session slots generated: ${sessionSlots.length}`);
      console.log("=== getAvailableSessionSlots END ===\n");

      return sessionSlots.sort(
        (a, b) => new Date(a.sessionDate) - new Date(b.sessionDate)
      );
    } catch (error) {
      console.error("Error in getAvailableSessionSlots:", error);
      throw error;
    }
  }

  // Book session by slot (easier method)
  async bookSessionBySlot(studentId, bookingData) {
    try {
      const { sessionId, courseId, topics, studentNotes } = bookingData;

      console.log('=== bookSessionBySlot START ===');
      console.log('Input data:', { studentId, sessionId, courseId, topics, studentNotes });

      // Get session slot details
      const slotDetails = await this.getSessionSlotDetails(sessionId);
      console.log('Slot details:', slotDetails);

      // Verify the slot is still available
      const existingBookingsCount = await BookingSession.countDocuments({
        tutorId: slotDetails.tutorId,
        sessionDate: slotDetails.sessionDate,
        status: { $in: ["pending", "confirmed"] },
        startTime: slotDetails.startTime,
        endTime: slotDetails.endTime,
      });

      console.log('Existing bookings count:', existingBookingsCount);

      if (existingBookingsCount >= slotDetails.totalSlots) {
        throw new Error(
          "Session is full. Maximum 5 students can book the same time slot"
        );
      }

      // Use the existing bookSession method with formatted data
      const sessionBookingData = {
        studentId,
        tutorId: slotDetails.tutorId,
        date: slotDetails.sessionDate,
        startTime: slotDetails.startTime,
        endTime: slotDetails.endTime,
        courseId,
        notes: studentNotes,
      };

      console.log('Session booking data:', sessionBookingData);

      return await this.bookSession(sessionBookingData);
    } catch (error) {
      throw error;
    }
  }

  // Get tutor's availability
  async getTutorAvailability(tutorId, filters = {}) {
    try {
      const query = {
        tutorId,
        isActive: true,
      };

      if (filters.dayOfWeek) {
        query.dayOfWeek = filters.dayOfWeek;
      }

      if (filters.courseId) {
        query.$or = [
          { courseSpecific: filters.courseId },
          { courseSpecific: null },
        ];
      }

      const availability = await TutorAvailability.find(query)
        .populate("tutorId", "firstName lastName email")
        .populate("courseSpecific", "title")
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
        isActive: true,
      };

      if (filters.dayOfWeek) {
        query.dayOfWeek = filters.dayOfWeek;
      }

      if (filters.courseId) {
        query.$or = [
          { courseSpecific: filters.courseId },
          { courseSpecific: null },
        ];
      }

      const availabilities = await TutorAvailability.find(query)
        .populate("tutorId", "firstName lastName email profilePic")
        .populate("courseSpecific", "title");

      // Group by tutor
      const tutorMap = new Map();
      availabilities.forEach((availability) => {
        const tutorId = availability.tutorId._id.toString();
        if (!tutorMap.has(tutorId)) {
          tutorMap.set(tutorId, {
            tutor: availability.tutorId,
            availabilities: [],
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
  async bookSession(bookingData) {
    try {
      const { studentId, tutorId, date, startTime, endTime, courseId, notes } =
        bookingData;

      // Verify student exists
      const student = await User.findById(studentId);
      if (!student) {
        throw new Error("Student not found");
      }

      // Verify tutor exists and has correct role
      const tutor = await User.findById(tutorId);
      if (!tutor || !["admin", "tutor", "super admin"].includes(tutor.role)) {
        throw new Error("Invalid tutor selected");
      }

      // Calculate duration from start and end times
      const duration = this.calculateDuration(startTime, endTime);
      console.log(`Duration calculation: ${startTime} to ${endTime} = ${duration} minutes`);

      // Check if tutor is available at the requested time
      const dayOfWeek = new Date(date).toLocaleDateString("en-US", {
        weekday: "long",
      }).toLowerCase();

      console.log(`Looking for availability on ${dayOfWeek} for tutor ${tutorId}`);

      const availability = await TutorAvailability.findOne({
        tutorId: tutorId,
        dayOfWeek,
        isActive: true,
        $or: [{ courseSpecific: courseId }, { courseSpecific: null }],
      });

      console.log('Found availability:', availability ? {
        id: availability._id,
        dayOfWeek: availability.dayOfWeek,
        hourlyRate: availability.hourlyRate,
        timeSlots: availability.timeSlots.length
      } : 'None');

      if (!availability) {
        throw new Error("Tutor is not available on this day");
      }

      // Check if the requested time slot is available (allow up to 5 students)
      const availableSlot = availability.timeSlots.find((slot) => {
        return (
          slot.isAvailable &&
          slot.currentBookings < Math.min(slot.maxBookings, 5) && // Limit to 5 students max
          this.isTimeConflict(startTime, endTime, slot.startTime, slot.endTime)
        );
      });

      if (!availableSlot) {
        throw new Error(
          "Tutor is not available at the requested time or session is full (max 5 students)"
        );
      }

      // Check for existing bookings count at the same time
      const existingBookingsCount = await BookingSession.countDocuments({
        tutorId: tutorId,
        sessionDate: date,
        status: { $in: ["pending", "confirmed"] },
        startTime: startTime,
        endTime: endTime,
      });

      if (existingBookingsCount >= 5) {
        throw new Error(
          "Session is full. Maximum 5 students can book the same time slot"
        );
      }

      // Generate meeting details
      const meetingDetails = this.generateMeetingUrl();

      // Determine session type based on existing bookings
      const sessionType = existingBookingsCount > 0 ? "group" : "one_on_one";

      // Calculate pricing
      const hourlyRate = availability.hourlyRate;
      let calculatedAmount = 0;
      
      if (hourlyRate && typeof hourlyRate.amount === 'number' && !isNaN(hourlyRate.amount) && hourlyRate.amount >= 0) {
        calculatedAmount = hourlyRate.amount * (duration / 60);
      }
      
      // Ensure the amount is not NaN and is a valid number
      if (isNaN(calculatedAmount) || !isFinite(calculatedAmount)) {
        calculatedAmount = 0;
      }
      
      // Round to 2 decimal places
      calculatedAmount = Math.round(calculatedAmount * 100) / 100;

      console.log('Pricing calculation:', {
        hourlyRate: hourlyRate,
        duration: duration,
        calculatedAmount: calculatedAmount,
        isNaN: isNaN(calculatedAmount),
        isFinite: isFinite(calculatedAmount)
      });

      // Create booking session
      const booking = new BookingSession({
        studentId,
        tutorId: tutorId,
        courseId: courseId,
        sessionDate: date,
        startTime,
        endTime,
        duration,
        timezone: availability.timezone,
        sessionType,
        topics: [],
        studentNotes: notes,
        meetingDetails,
        pricing: {
          amount: calculatedAmount,
          currency: (availability.hourlyRate && availability.hourlyRate.currency) || "USD",
          paymentStatus: calculatedAmount > 0 ? "pending" : "free",
        },
      });

      console.log('About to save booking with pricing:', {
        amount: calculatedAmount,
        currency: (availability.hourlyRate && availability.hourlyRate.currency) || "USD",
        paymentStatus: calculatedAmount > 0 ? "pending" : "free"
      });

      await booking.save();

      // Update availability slot booking count
      availableSlot.currentBookings += 1;
      await availability.save();

      const populatedBooking = await BookingSession.findById(booking._id)
        .populate("studentId", "firstName lastName email")
        .populate("tutorId", "firstName lastName email")
        .populate("courseId", "title");

      // Send email notifications
      try {
        const sessionDetails = {
          bookingId: populatedBooking._id.toString(),
          date: new Date(populatedBooking.sessionDate).toLocaleDateString(),
          startTime: populatedBooking.startTime,
          endTime: populatedBooking.endTime,
          duration: populatedBooking.duration,
          sessionType: populatedBooking.sessionType,
          status: populatedBooking.status,
          studentNotes: populatedBooking.studentNotes,
          meetingUrl: populatedBooking.meetingDetails?.meetingUrl,
          meetingId: populatedBooking.meetingDetails?.meetingId,
          password: populatedBooking.meetingDetails?.password,
        };

        // Send confirmation email to student
        await sendSessionBookingStudentEmail(
          populatedBooking.studentId.email,
          populatedBooking.studentId.firstName,
          `${populatedBooking.tutorId.firstName} ${populatedBooking.tutorId.lastName}`,
          sessionDetails
        );

        // Send notification email to tutor
        await sendSessionBookingTutorEmail(
          populatedBooking.tutorId.email,
          `${populatedBooking.tutorId.firstName} ${populatedBooking.tutorId.lastName}`,
          `${populatedBooking.studentId.firstName} ${populatedBooking.studentId.lastName}`,
          sessionDetails
        );

        // Send notification email to admin (get admin email from env or find admin users)
        const adminEmails = process.env.ADMIN_EMAIL
          ? [process.env.ADMIN_EMAIL]
          : [];

        // Also find admin users from database
        const adminUsers = await User.find({
          role: { $in: ["admin", "super admin"] },
        }).select("email");
        adminUsers.forEach((admin) => {
          if (admin.email && !adminEmails.includes(admin.email)) {
            adminEmails.push(admin.email);
          }
        });

        // Send admin notifications
        for (const adminEmail of adminEmails) {
          await sendSessionBookingAdminEmail(
            adminEmail,
            `${populatedBooking.studentId.firstName} ${populatedBooking.studentId.lastName}`,
            `${populatedBooking.tutorId.firstName} ${populatedBooking.tutorId.lastName}`,
            sessionDetails
          );
        }
      } catch (emailError) {
        console.error("Error sending booking notification emails:", emailError);
        // Don't throw error here to avoid blocking the booking process
      }

      return populatedBooking;
    } catch (error) {
      throw error;
    }
  }

  // Helper function to calculate duration in minutes
  calculateDuration(startTime, endTime) {
    const toMinutes = (time) => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const startMinutes = toMinutes(startTime);
    const endMinutes = toMinutes(endTime);
    const duration = endMinutes - startMinutes;
    
    // Validate duration
    if (isNaN(duration) || duration <= 0) {
      throw new Error(`Invalid duration calculated from ${startTime} to ${endTime}`);
    }
    
    return duration;
  }

  // Get user's bookings (updated to match controller expectations)
  async getUserBookings(userId, options = {}) {
    try {
      const { status, page = 1, limit = 10, type } = options;
      
      console.log('=== getUserBookings START ===');
      console.log('Input params:', { userId, status, page, limit, type });

      // Determine if user is student or tutor based on type or user role
      let query = {};
      if (type === "student") {
        query.studentId = userId;
      } else if (type === "tutor") {
        query.tutorId = userId;
      } else {
        // Auto-detect based on user role
        const user = await User.findById(userId);
        console.log('Found user:', user ? { id: user._id, role: user.role, name: `${user.firstName} ${user.lastName}` } : 'Not found');
        
        if (user && ["admin", "tutor", "super admin"].includes(user.role)) {
          query.tutorId = userId;
        } else {
          query.studentId = userId;
        }
      }

      if (status) {
        query.status = status;
      }

      console.log('Query to be executed:', query);

      const skip = (page - 1) * limit;
      const bookings = await BookingSession.find(query)
        .populate("studentId", "firstName lastName email")
        .populate("tutorId", "firstName lastName email")
        .populate("courseId", "title")
        .sort({ sessionDate: -1, startTime: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      console.log('Found bookings:', bookings.length);
      if (bookings.length > 0) {
        console.log('First booking:', {
          id: bookings[0]._id,
          studentId: bookings[0].studentId,
          tutorId: bookings[0].tutorId,
          sessionDate: bookings[0].sessionDate,
          status: bookings[0].status
        });
      }

      const total = await BookingSession.countDocuments(query);
      console.log('Total count:', total);

      return {
        bookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in getUserBookings:', error);
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
        const dayOfWeek = new Date(booking.sessionDate).toLocaleDateString(
          "en-US",
          { weekday: "long" }
        ).toLowerCase();
        const availability = await TutorAvailability.findOne({
          tutorId: booking.tutorId,
          dayOfWeek,
          isActive: true,
        });

        if (availability) {
          const slot = availability.timeSlots.find((slot) =>
            this.isTimeConflict(
              booking.startTime,
              booking.endTime,
              slot.startTime,
              slot.endTime
            )
          );
          if (slot && slot.currentBookings > 0) {
            slot.currentBookings -= 1;
            await availability.save();
          }
        }
      }

      return await BookingSession.findById(bookingId)
        .populate("studentId", "firstName lastName email")
        .populate("tutorId", "firstName lastName email")
        .populate("courseId", "title");
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
      if (
        availability.tutorId.toString() !== tutorId &&
        tutor.role !== "super admin"
      ) {
        throw new Error("You can only delete your own availability");
      }

      // Check if there are pending or confirmed bookings
      const hasBookings = await BookingSession.findOne({
        tutorId: availability.tutorId,
        sessionDate: { $gte: new Date() },
        status: { $in: ["pending", "confirmed"] },
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
            totalEarnings: { $sum: "$pricing.amount" },
          },
        },
      ]);

      const totalBookings = await BookingSession.countDocuments({ tutorId });
      const averageRating = await BookingSession.aggregate([
        {
          $match: {
            tutorId: new mongoose.Types.ObjectId(tutorId),
            "feedback.studentRating": { $exists: true },
          },
        },
        {
          $group: { _id: null, avgRating: { $avg: "$feedback.studentRating" } },
        },
      ]);

      return {
        totalBookings,
        bookingsByStatus: stats,
        averageRating: averageRating[0]?.avgRating || 0,
      };
    } catch (error) {
      throw error;
    }
  }

  // Get specific booking details
  async getBookingDetails(bookingId, userId) {
    try {
      const booking = await BookingSession.findById(bookingId)
        .populate("studentId", "firstName lastName email")
        .populate("tutorId", "firstName lastName email")
        .populate("courseId", "title");

      if (!booking) {
        throw new Error("Booking not found");
      }

      // Check permissions
      const isStudent = booking.studentId._id.toString() === userId;
      const isTutor = booking.tutorId._id.toString() === userId;

      if (!isStudent && !isTutor) {
        const user = await User.findById(userId);
        if (!user || user.role !== "super admin") {
          throw new Error("Access denied");
        }
      }

      return booking;
    } catch (error) {
      throw error;
    }
  }

  // Cancel booking
  async cancelBooking(bookingId, userId, reason) {
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

      // Update booking status
      booking.status = "cancelled";
      booking.cancellationReason = reason;
      booking.cancelledBy = userId;
      booking.cancelledAt = new Date();

      await booking.save();

      // Update availability slot count
      const dayOfWeek = new Date(booking.sessionDate).toLocaleDateString(
        "en-US",
        { weekday: "long" }
      ).toLowerCase();
      const availability = await TutorAvailability.findOne({
        tutorId: booking.tutorId,
        dayOfWeek,
        isActive: true,
      });

      if (availability) {
        const slot = availability.timeSlots.find((slot) =>
          this.isTimeConflict(
            booking.startTime,
            booking.endTime,
            slot.startTime,
            slot.endTime
          )
        );
        if (slot && slot.currentBookings > 0) {
          slot.currentBookings -= 1;
          await availability.save();
        }
      }

      // Update group session type if needed
      await this.updateGroupSessionType(
        booking.tutorId,
        booking.sessionDate,
        booking.startTime,
        booking.endTime
      );

      return await BookingSession.findById(bookingId)
        .populate("studentId", "firstName lastName email")
        .populate("tutorId", "firstName lastName email")
        .populate("courseId", "title");
    } catch (error) {
      throw error;
    }
  }

  // Reschedule booking
  async rescheduleBooking(bookingId, rescheduleData) {
    try {
      const { date, startTime, endTime, reason, userId } = rescheduleData;

      console.log('=== rescheduleBooking START ===');
      console.log('Input data:', { bookingId, date, startTime, endTime, reason, userId });

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

      // Check if tutor is available at the new time
      const dayOfWeek = new Date(date).toLocaleDateString("en-US", {
        weekday: "long",
      }).toLowerCase();
      
      console.log('Looking for availability on:', dayOfWeek, 'for tutor:', booking.tutorId);
      
      const availability = await TutorAvailability.findOne({
        tutorId: booking.tutorId,
        dayOfWeek,
        isActive: true,
      });

      console.log('Found availability:', availability ? {
        id: availability._id,
        dayOfWeek: availability.dayOfWeek,
        timeSlots: availability.timeSlots.length
      } : 'None');

      if (!availability) {
        throw new Error("Tutor is not available on the requested day");
      }

      // Check if the specific time slot is available
      const availableSlot = availability.timeSlots.find(slot => {
        const slotAvailable = slot.isAvailable && 
                             slot.currentBookings < Math.min(slot.maxBookings, 5);
        const timeOverlap = this.isTimeConflict(startTime, endTime, slot.startTime, slot.endTime);
        
        console.log('Checking slot:', {
          slotTime: `${slot.startTime}-${slot.endTime}`,
          requestedTime: `${startTime}-${endTime}`,
          isAvailable: slot.isAvailable,
          currentBookings: slot.currentBookings,
          maxBookings: slot.maxBookings,
          slotAvailable,
          timeOverlap
        });
        
        return slotAvailable && timeOverlap;
      });

      if (!availableSlot) {
        throw new Error("Tutor is not available at the requested time slot");
      }

      // Check for existing bookings at the same time (excluding current booking)
      const existingBookingsCount = await BookingSession.countDocuments({
        _id: { $ne: bookingId }, // Exclude current booking
        tutorId: booking.tutorId,
        sessionDate: date,
        status: { $in: ["pending", "confirmed"] },
        startTime: startTime,
        endTime: endTime
      });

      console.log('Existing bookings at this time:', existingBookingsCount);

      if (existingBookingsCount >= 5) {
        throw new Error("Time slot is full. Maximum 5 students can book the same time slot");
      }

      // Update booking
      booking.sessionDate = date;
      booking.startTime = startTime;
      booking.endTime = endTime;
      booking.status = "confirmed"; // Set to confirmed instead of rescheduled
      booking.rescheduleReason = reason;
      booking.rescheduledBy = userId;
      booking.rescheduledAt = new Date();

      await booking.save();

      console.log('Booking rescheduled successfully');

      return await BookingSession.findById(bookingId)
        .populate("studentId", "firstName lastName email")
        .populate("tutorId", "firstName lastName email")
        .populate("courseId", "title");
    } catch (error) {
      console.error('Error in rescheduleBooking:', error);
      throw error;
    }
  }

  // Complete session
  async completeSession(bookingId, tutorId, notes) {
    try {
      const booking = await BookingSession.findById(bookingId);

      if (!booking) {
        throw new Error("Booking not found");
      }

      if (booking.tutorId.toString() !== tutorId) {
        throw new Error("Only the assigned tutor can complete the session");
      }

      if (booking.status !== "confirmed") {
        throw new Error("Only confirmed bookings can be completed");
      }

      // Update booking
      booking.status = "completed";
      booking.completedAt = new Date();
      booking.sessionNotes = notes;

      await booking.save();

      return await BookingSession.findById(bookingId)
        .populate("studentId", "firstName lastName email")
        .populate("tutorId", "firstName lastName email")
        .populate("courseId", "title");
    } catch (error) {
      throw error;
    }
  }

  // Submit session feedback
  async submitSessionFeedback(bookingId, userId, rating, feedbackComment) {
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
        booking.feedback.studentRating = rating;
        booking.feedback.studentComment = feedbackComment;
      } else {
        booking.feedback.tutorRating = rating;
        booking.feedback.tutorComment = feedbackComment;
      }

      await booking.save();

      return booking.feedback;
    } catch (error) {
      throw error;
    }
  }

  // Get session statistics
  async getSessionStats(tutorId, period = "month") {
    try {
      let dateFilter = {};
      const now = new Date();

      switch (period) {
        case "week":
          dateFilter = {
            $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          };
          break;
        case "month":
          dateFilter = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
          break;
        case "year":
          dateFilter = { $gte: new Date(now.getFullYear(), 0, 1) };
          break;
      }

      const stats = await BookingSession.aggregate([
        {
          $match: {
            tutorId: new mongoose.Types.ObjectId(tutorId),
            sessionDate: dateFilter,
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalEarnings: { $sum: "$pricing.amount" },
          },
        },
      ]);

      const totalBookings = await BookingSession.countDocuments({
        tutorId,
        sessionDate: dateFilter,
      });

      const averageRating = await BookingSession.aggregate([
        {
          $match: {
            tutorId: new mongoose.Types.ObjectId(tutorId),
            "feedback.studentRating": { $exists: true },
            sessionDate: dateFilter,
          },
        },
        {
          $group: { _id: null, avgRating: { $avg: "$feedback.studentRating" } },
        },
      ]);

      return {
        period,
        totalBookings,
        bookingsByStatus: stats,
        averageRating: averageRating[0]?.avgRating || 0,
        totalEarnings: stats.reduce((sum, stat) => sum + stat.totalEarnings, 0),
      };
    } catch (error) {
      throw error;
    }
  }

  // Get session participants (students who booked the same time slot)
  async getSessionParticipants(tutorId, sessionDate, startTime, endTime) {
    try {
      const participants = await BookingSession.find({
        tutorId,
        sessionDate,
        startTime,
        endTime,
        status: { $in: ["pending", "confirmed"] },
      })
        .populate("studentId", "firstName lastName email profilePic")
        .sort({ createdAt: 1 });

      return {
        totalParticipants: participants.length,
        maxParticipants: 5,
        availableSlots: 5 - participants.length,
        participants: participants.map((booking) => ({
          bookingId: booking._id,
          student: booking.studentId,
          status: booking.status,
          bookedAt: booking.createdAt,
          studentNotes: booking.studentNotes,
        })),
      };
    } catch (error) {
      throw error;
    }
  }

  // Update existing group session participants when someone cancels
  async updateGroupSessionType(tutorId, sessionDate, startTime, endTime) {
    try {
      const remainingBookings = await BookingSession.countDocuments({
        tutorId,
        sessionDate,
        startTime,
        endTime,
        status: { $in: ["pending", "confirmed"] },
      });

      // Update session type based on remaining participants
      const newSessionType = remainingBookings > 1 ? "group" : "one_on_one";

      await BookingSession.updateMany(
        {
          tutorId,
          sessionDate,
          startTime,
          endTime,
          status: { $in: ["pending", "confirmed"] },
        },
        { sessionType: newSessionType }
      );

      return newSessionType;
    } catch (error) {
      throw error;
    }
  }

  // Helper method to generate time slots within a time block
  generateTimeSlots(startTime, endTime, sessionDuration) {
    console.log(
      `      generateTimeSlots called with: startTime=${startTime}, endTime=${endTime}, sessionDuration=${sessionDuration}`
    );

    const slots = [];

    // Convert time strings to minutes
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    console.log(
      `      Converted times: startMinutes=${startMinutes}, endMinutes=${endMinutes}`
    );

    // Generate slots based on session duration
    for (
      let current = startMinutes;
      current + sessionDuration <= endMinutes;
      current += sessionDuration
    ) {
      const slotStart = this.minutesToTime(current);
      const slotEnd = this.minutesToTime(current + sessionDuration);

      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
      });

      console.log(`      Generated slot: ${slotStart} - ${slotEnd}`);
    }

    console.log(`      Total slots generated: ${slots.length}`);
    return slots;
  }

  // Helper method to convert time string to minutes
  timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(":").map(Number);
    return hours * 60 + minutes;
  }

  // Helper method to convert minutes to time string
  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}`;
  }

  // Get detailed info about a specific session slot
  async getSessionSlotDetails(slotId) {
    try {
      // Parse the slot ID to get components
      const parts = slotId.split("_");
      if (parts.length < 4) {
        throw new Error("Invalid slot ID format");
      }

      const availabilityId = parts[0];
      const slotIndex = parseInt(parts[1]);
      const timeSlotIndex = parseInt(parts[2]);
      const sessionDate = parts[3];

      // Get availability
      const availability = await TutorAvailability.findById(availabilityId)
        .populate("tutorId", "firstName lastName email")
        .populate("courseSpecific", "title description");

      if (!availability) {
        throw new Error("Availability not found");
      }

      const slot = availability.timeSlots[slotIndex];
      if (!slot) {
        throw new Error("Time slot not found");
      }

      // Generate the specific time slot
      const sessionDuration = slot.sessionDuration || 60;
      const timeSlots = this.generateTimeSlots(
        slot.startTime,
        slot.endTime,
        sessionDuration
      );

      if (!timeSlots[timeSlotIndex]) {
        throw new Error("Time slot index not found");
      }

      const specificTimeSlot = timeSlots[timeSlotIndex];

      return {
        sessionId: slotId,
        availabilityId: availability._id,
        slotIndex,
        timeSlotIndex,
        tutorId: availability.tutorId._id,
        tutorName: `${availability.tutorId.firstName} ${availability.tutorId.lastName}`,
        tutorEmail: availability.tutorId.email,
        sessionDate,
        dayOfWeek: availability.dayOfWeek,
        startTime: specificTimeSlot.startTime,
        endTime: specificTimeSlot.endTime,
        duration: sessionDuration,
        availableSlots: Math.min(slot.maxBookings, 5) - slot.currentBookings,
        totalSlots: Math.min(slot.maxBookings, 5),
        pricing: availability.hourlyRate || { amount: 0, currency: "USD" },
        course: availability.courseSpecific,
        timezone: availability.timezone,
        description: availability.description,
      };
    } catch (error) {
      throw new Error(`Failed to get session slot details: ${error.message}`);
    }
  }
}

export default new BookingService();
