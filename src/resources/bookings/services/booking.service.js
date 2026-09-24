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
  sendSessionRescheduledEmail,
} from "../../../utils/email/email-sender.js";
import SubscriptionService from "../../payments/services/subscription.service.js";
import logger from "../../../utils/log/logger.js";
import { assertMinimumLeadTime, isSlotBookable } from "../../../utils/helper/bookingLeadTime.js";
import { calendarLinksForBooking } from "../../../utils/helper/calendarLinks.js";
import { dashboardSessionUrl } from "../../../utils/helper/frontendUrls.js";
import moment from "moment-timezone";

/** Hard cap: every session (book + reschedule) holds at most 5 students. */
const MAX_STUDENTS_PER_SESSION = 5;
const OCCUPYING_BOOKING_STATUSES = ["pending", "confirmed"];

function effectiveMaxBookings(_slot) {
  return MAX_STUDENTS_PER_SESSION;
}

function sessionDateKey(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().slice(0, 10);
}

function occupyingQuery({
  tutorId,
  sessionDate,
  startTime,
  endTime,
  excludeBookingId,
}) {
  const query = {
    tutorId,
    sessionDate,
    startTime,
    status: { $in: OCCUPYING_BOOKING_STATUSES },
  };
  if (endTime) query.endTime = endTime;
  if (excludeBookingId) query._id = { $ne: excludeBookingId };
  return query;
}

async function countOccupyingStudents(params) {
  return BookingSession.countDocuments(occupyingQuery(params));
}

function slotFullError(cap = MAX_STUDENTS_PER_SESSION) {
  return new Error(
    `Session is full. Maximum ${cap} student(s) can join this time slot`,
  );
}

function normalizeIncomingTimeSlot(slot) {
  const n = Number(slot.maxBookings ?? slot.slots);
  const maxBookings =
    !Number.isFinite(n) || n < 1
      ? MAX_STUDENTS_PER_SESSION
      : Math.min(Math.floor(n), MAX_STUDENTS_PER_SESSION);
  const { slots: _slots, ...rest } = slot;
  return {
    ...rest,
    maxBookings,
    currentBookings: Number(slot.currentBookings) || 0,
  };
}

function deny(message, statusCode = 403) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const STATUS_TRANSITIONS = {
  student: {
    pending: ["cancelled"],
    confirmed: ["cancelled"],
    waiting: ["cancelled"],
  },
  tutor: {
    pending: ["confirmed", "cancelled"],
    confirmed: ["completed", "cancelled", "no_show"],
    waiting: ["completed", "cancelled"],
  },
  admin: {
    pending: ["confirmed", "cancelled"],
    confirmed: ["completed", "cancelled", "no_show"],
    waiting: ["completed", "cancelled"],
  },
};

function actorKind({ isStudent, isTutor, isAdmin }) {
  if (isAdmin) return "admin";
  if (isTutor) return "tutor";
  if (isStudent) return "student";
  return null;
}

function assertStatusTransition(kind, from, to) {
  const allowed = STATUS_TRANSITIONS[kind]?.[from] || [];
  if (!allowed.includes(to)) {
    throw deny(`Cannot change booking from ${from} to ${to}`);
  }
}

function attendanceSnapshot(booking) {
  const studentJoined = Boolean(booking.attendance?.studentJoinedAt);
  const tutorJoined = Boolean(booking.attendance?.tutorJoinedAt);
  let state = "upcoming";
  if (studentJoined && tutorJoined) state = "attended";
  else if (studentJoined || tutorJoined) state = "waiting";
  return { studentJoined, tutorJoined, state };
}

function resolveBookingAdminEmails() {
  const emails = [];
  const add = (value) => {
    String(value || "")
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean)
      .forEach((email) => {
        if (!emails.includes(email)) emails.push(email);
      });
  };
  add(process.env.ADMIN_EMAIL);
  add(process.env.BOOKING_ADMIN_NOTIFY_EMAILS);
  return emails;
}

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

      // Check if using new selectedDates format
      if (
        availabilityData.selectedDates &&
        Array.isArray(availabilityData.selectedDates)
      ) {
        // Handle new format with selectedDates array
        return await this.setAvailabilityBySelectedDates(
          tutorId,
          availabilityData,
          tutor,
        );
      } else {
        // Handle legacy format with dayOfWeek
        return await this.setAvailabilityByDayOfWeek(
          tutorId,
          availabilityData,
          tutor,
        );
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Replace all availability for a tutor (or one course) with the payload sent by the client.
   * Deletes existing schedule rows first, then creates the new ones.
   */
  async replaceTutorAvailability(tutorId, availabilityData) {
    const tutor = await User.findById(tutorId);
    if (!tutor || !["admin", "tutor", "super admin"].includes(tutor.role)) {
      throw new Error("Only tutors and admins can set availability");
    }

    const deleteQuery = { tutorId };
    if (availabilityData.courseSpecific) {
      deleteQuery.courseSpecific = availabilityData.courseSpecific;
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const upcomingBookings = await BookingSession.countDocuments({
      tutorId,
      status: { $in: ["pending", "confirmed"] },
      sessionDate: { $gte: startOfToday },
      ...(availabilityData.courseSpecific
        ? { courseId: availabilityData.courseSpecific }
        : {}),
    });

    if (upcomingBookings > 0) {
      throw new Error(
        "Cannot replace availability while there are upcoming booked sessions. Reschedule or cancel them first.",
      );
    }

    await TutorAvailability.deleteMany(deleteQuery);

    const created = await this.setTutorAvailability(tutorId, availabilityData);

    return {
      replaced: true,
      deletedScope: availabilityData.courseSpecific
        ? "course"
        : "all",
      availability: created,
    };
  }

  // Helper method: Set availability using selectedDates format (new)
  async setAvailabilityBySelectedDates(tutorId, availabilityData, tutor) {
    try {
      const {
        selectedDates,
        timezone,
        isRecurring,
        description,
        courseSpecific,
        hourlyRate,
      } = availabilityData;

      // Validate course if specified
      if (courseSpecific) {
        const course = await Course.findById(courseSpecific);
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

      const createdAvailabilities = [];

      // Loop through each selected date
      for (const dateEntry of selectedDates) {
        const { date, timeSlots } = dateEntry;

        // Parse the date and extract dayOfWeek
        const parsedDate = new Date(date);
        const dayOfWeek = parsedDate
          .toLocaleDateString("en-US", { weekday: "long" })
          .toLowerCase();

        // Process time slots with defaults
        const processedTimeSlots = timeSlots.map((slot) =>
          normalizeIncomingTimeSlot(slot),
        );

        // Create processed data for this date
        const processedData = {
          tutorId,
          dayOfWeek,
          timeSlots: processedTimeSlots,
          timezone: timezone || "UTC",
          isRecurring: isRecurring !== undefined ? isRecurring : false, // Default to false for specific dates
          specificDate: parsedDate,
          description: description || "",
          courseSpecific: courseSpecific || null,
          hourlyRate: hourlyRate || null,
          isActive: true,
        };

        // Check for existing availability on the same specific date
        const existingAvailability = await TutorAvailability.findOne({
          tutorId,
          specificDate: parsedDate,
          courseSpecific: courseSpecific || null,
        });

        if (existingAvailability) {
          // Update existing availability
          existingAvailability.timeSlots = processedTimeSlots;
          existingAvailability.timezone = processedData.timezone;
          existingAvailability.dayOfWeek = dayOfWeek;
          existingAvailability.isRecurring = processedData.isRecurring;
          existingAvailability.hourlyRate =
            processedData.hourlyRate || existingAvailability.hourlyRate;
          existingAvailability.description =
            processedData.description || existingAvailability.description;
          existingAvailability.isActive = true;

          await existingAvailability.save();
          createdAvailabilities.push(existingAvailability);
        } else {
          // Create new availability
          const availability = new TutorAvailability(processedData);
          await availability.save();

          const populatedAvailability = await TutorAvailability.findById(
            availability._id,
          )
            .populate("tutorId", "firstName lastName email")
            .populate("courseSpecific", "title");

          createdAvailabilities.push(populatedAvailability);
        }
      }

      return createdAvailabilities;
    } catch (error) {
      throw error;
    }
  }

  // Helper method: Set availability using dayOfWeek format (legacy)
  async setAvailabilityByDayOfWeek(tutorId, availabilityData, tutor) {
    try {
      // Validate and set defaults for availability data
      const processedData = {
        timeSlots: availabilityData.timeSlots.map((slot) =>
          normalizeIncomingTimeSlot(slot),
        ),
        timezone: availabilityData.timezone || "UTC",
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

      // Handle dayOfWeek logic
      if (availabilityData.specificDate) {
        // If specific date is provided, extract dayOfWeek from it
        const date = new Date(availabilityData.specificDate);
        processedData.dayOfWeek = date
          .toLocaleDateString("en-US", { weekday: "long" })
          .toLowerCase();
        processedData.isRecurring = false; // Specific dates are not recurring
      } else if (availabilityData.dayOfWeek) {
        // Use provided dayOfWeek
        processedData.dayOfWeek = availabilityData.dayOfWeek.toLowerCase();
      } else {
        // Default to current day
        processedData.dayOfWeek = new Date()
          .toLocaleDateString("en-US", { weekday: "long" })
          .toLowerCase();
      }

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
      // First, get tutors who have courses (instructors or assistants)
      const tutorsWithCourses = await Course.find({
        $or: [
          { instructor: { $exists: true } },
          { assistants: { $exists: true, $ne: [] } },
        ],
      }).distinct("instructor");

      // Also get assistants from courses
      const coursesWithAssistants = await Course.find({
        assistants: { $exists: true, $ne: [] },
      }).populate("assistants", "_id");

      const assistantIds = [];
      coursesWithAssistants.forEach((course) => {
        course.assistants.forEach((assistant) => {
          assistantIds.push(assistant._id);
        });
      });

      // Combine instructors and assistants
      const allTutorsWithCourses = [
        ...new Set([
          ...tutorsWithCourses.map((id) => id.toString()),
          ...assistantIds.map((id) => id.toString()),
        ]),
      ];

      let query = {
        isActive: true,
      };

      // If specific tutorId is provided, check if they have courses
      if (tutorId) {
        if (!allTutorsWithCourses.includes(tutorId.toString())) {
          return [];
        }
        query.tutorId = tutorId;
      } else {
        // If no specific tutor, only return availability for tutors with courses
        query.tutorId = { $in: allTutorsWithCourses };
      }

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
        .populate("tutorId", "firstName lastName email")
        .populate("courseSpecific", "title")
        .sort({ dayOfWeek: 1 });

      const occupancyTutorIds = [
        ...new Set(
          availabilities
            .map((a) => a.tutorId?._id?.toString())
            .filter(Boolean),
        ),
      ];
      const occupancyFrom = new Date();
      occupancyFrom.setHours(0, 0, 0, 0);
      const occupancyTo = new Date(occupancyFrom);
      occupancyTo.setDate(occupancyTo.getDate() + 28);

      const occupyingBookings = occupancyTutorIds.length
        ? await BookingSession.find({
            tutorId: { $in: occupancyTutorIds },
            sessionDate: { $gte: occupancyFrom, $lte: occupancyTo },
            status: { $in: OCCUPYING_BOOKING_STATUSES },
          }).select("tutorId sessionDate startTime")
        : [];

      const occupyingBySlot = new Map();
      for (const booking of occupyingBookings) {
        const key = `${booking.tutorId.toString()}|${sessionDateKey(booking.sessionDate)}|${booking.startTime}`;
        occupyingBySlot.set(key, (occupyingBySlot.get(key) || 0) + 1);
      }

      // Format slots for easy booking
      const sessionSlots = [];

      availabilities.forEach((availability, availIndex) => {
        availability.timeSlots.forEach((slot, index) => {
          if (slot.isAvailable) {
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

            for (let week = 0; week < 4; week++) {
              const sessionDate = new Date(today);

              // Calculate days to add to get to the target day
              let daysToAdd = targetDay - today.getDay();
              if (daysToAdd < 0) {
                daysToAdd += 7; // Move to next week if target day has passed
              }
              daysToAdd += week * 7; // Add additional weeks

              sessionDate.setDate(today.getDate() + daysToAdd);
              sessionDate.setHours(0, 0, 0, 0); // Reset time to start of day

              // Format date as YYYY-MM-DD using local time to avoid UTC shift
              const year = sessionDate.getFullYear();
              const month = String(sessionDate.getMonth() + 1).padStart(2, "0");
              const day = String(sessionDate.getDate()).padStart(2, "0");
              const dateString = `${year}-${month}-${day}`;

              // Check if date is today or in future
              if (
                sessionDate >= today ||
                dateString === today.toISOString().split("T")[0]
              ) {
                // Generate individual session slots within the time block
                const sessionDuration = slot.sessionDuration || 60;
                const timeSlots = this.generateTimeSlots(
                  slot.startTime,
                  slot.endTime,
                  sessionDuration,
                );

                timeSlots.forEach((timeSlot, slotIndex) => {
                  if (
                    !isSlotBookable(
                      dateString,
                      timeSlot.startTime,
                      availability.timezone || "UTC",
                    )
                  ) {
                    return;
                  }

                  const cap = effectiveMaxBookings(slot);
                  const occupied =
                    occupyingBySlot.get(
                      `${availability.tutorId._id.toString()}|${dateString}|${timeSlot.startTime}`,
                    ) || 0;
                  const remaining = Math.max(0, cap - occupied);
                  if (remaining <= 0) return;

                  const sessionSlot = {
                    sessionId: `${availability._id}_${index}_${slotIndex}_${dateString}`,
                    availabilityId: availability._id,
                    slotIndex: index,
                    timeSlotIndex: slotIndex,
                    tutorId: availability.tutorId._id,
                    tutorName: `${availability.tutorId.firstName} ${availability.tutorId.lastName}`,
                    sessionDate: dateString,
                    dayOfWeek: availability.dayOfWeek,
                    startTime: timeSlot.startTime,
                    endTime: timeSlot.endTime,
                    duration: sessionDuration,
                    availableSlots: remaining,
                    totalSlots: cap,
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
                });
              } else {
              }
            }
          } else {
          }
        });
      });

      // Get courses for each tutor to include in response
      const uniqueTutorIds = [
        ...new Set(sessionSlots.map((slot) => slot.tutorId.toString())),
      ];
      const tutorCourses = {};
      uniqueTutorIds.forEach((id) => {
        tutorCourses[id] = [];
      });

      if (uniqueTutorIds.length) {
        const courses = await Course.find({
          $or: [
            { instructor: { $in: uniqueTutorIds } },
            { assistants: { $in: uniqueTutorIds } },
          ],
        }).select("_id title category level price thumbnail instructor assistants");

        for (const course of courses) {
          const related = new Set(
            [
              course.instructor?.toString(),
              ...(course.assistants || []).map((id) => id.toString()),
            ].filter(Boolean),
          );
          for (const tutorId of uniqueTutorIds) {
            if (related.has(tutorId)) {
              tutorCourses[tutorId].push(course);
            }
          }
        }
      }

      // Add tutor courses to each session slot
      const enhancedSessionSlots = sessionSlots.map((slot) => ({
        ...slot,
        tutorCourses: tutorCourses[slot.tutorId.toString()] || [],
      }));

      return enhancedSessionSlots.sort(
        (a, b) => new Date(a.sessionDate) - new Date(b.sessionDate),
      );
    } catch (error) {
      throw error;
    }
  }

  // Book session by slot (easier method)
  async bookSessionBySlot(studentId, bookingData) {
    try {
      const { sessionId, courseId, topics, studentNotes } = bookingData;

      // Get session slot details
      const slotDetails = await this.getSessionSlotDetails(sessionId);

      const slotCap = MAX_STUDENTS_PER_SESSION;
      const existingBookingsCount = await countOccupyingStudents({
        tutorId: slotDetails.tutorId,
        sessionDate: slotDetails.sessionDate,
        startTime: slotDetails.startTime,
        endTime: slotDetails.endTime,
      });

      if (existingBookingsCount >= slotCap) {
        throw slotFullError(slotCap);
      }

      // Use the existing bookSession method with formatted data
      const sessionBookingData = {
        studentId,
        tutorId: slotDetails.tutorId,
        date: slotDetails.sessionDate,
        startTime: slotDetails.startTime,
        endTime: slotDetails.endTime,
        courseId,
        topics,
        notes: studentNotes,
        availabilityId: slotDetails.availabilityId, // Pass specific availability ID
      };

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

      // Get tutor's courses
      const tutorCourses = await Course.find({
        $or: [{ instructor: tutorId }, { assistants: tutorId }],
        isActive: true,
      }).select("title description category level price thumbnail");

      const availability = await TutorAvailability.find(query)
        .populate("tutorId", "firstName lastName email profilePic")
        .populate("courseSpecific", "title")
        .sort({ dayOfWeek: 1 });

      // IMPORTANT:
      // Do not drop tutor availability blocks just because their specificDate is in the past.
      // The frontend expects this endpoint to return the availability the tutor configured;
      // otherwise it breaks when the tutor has only set past availability.
      //
      // We still add an `isPast` flag so the UI can choose to hide/disable it if desired.
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const availabilityWithMeta = availability.map((availDoc) => {
        const obj = availDoc?.toObject ? availDoc.toObject() : availDoc;

        let isPast = false;
        if (obj?.specificDate) {
          const availDate = new Date(obj.specificDate);
          availDate.setHours(0, 0, 0, 0);
          isPast = availDate < today;
        }

        return {
          ...obj,
          isPast,
        };
      });

      return {
        availability: availabilityWithMeta,
        tutorCourses,
        tutorInfo:
          availabilityWithMeta.length > 0 ? availabilityWithMeta[0].tutorId : null,
      };
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
      const {
        studentId,
        tutorId,
        date,
        startTime,
        endTime,
        courseId,
        topics,
        notes,
        availabilityId, // Optional: specific availability ID
      } = bookingData;

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

      // Check if tutor is available at the requested time
      const dayOfWeek = new Date(date)
        .toLocaleDateString("en-US", {
          weekday: "long",
        })
        .toLowerCase();

      // Use specific availabilityId if provided, otherwise query by dayOfWeek
      let availability;
      if (availabilityId) {
        availability = await TutorAvailability.findOne({
          _id: availabilityId,
          tutorId: tutorId,
          isActive: true,
        });
      } else {
        availability = await TutorAvailability.findOne({
          tutorId: tutorId,
          dayOfWeek,
          isActive: true,
          $or: [{ courseSpecific: courseId }, { courseSpecific: null }],
        });
      }

      if (!availability) {
        throw new Error("Tutor is not available on this day");
      }

      // Check if the requested time slot is available (respects tutor max bookings per block)
      const availableSlot = availability.timeSlots.find((slot) => {
        return (
          slot.isAvailable &&
          this.isTimeConflict(startTime, endTime, slot.startTime, slot.endTime)
        );
      });

      if (!availableSlot) {
        throw new Error(
          "Tutor is not available at the requested time or this session time is full",
        );
      }

      assertMinimumLeadTime(date, startTime, availability.timezone || "UTC");

      const duplicate = await BookingSession.findOne({
        studentId,
        tutorId,
        sessionDate: date,
        startTime,
        status: { $in: OCCUPYING_BOOKING_STATUSES },
      });
      if (duplicate) {
        throw new Error("You already have a booking for this session time");
      }

      const existingBookingsCount = await countOccupyingStudents({
        tutorId,
        sessionDate: date,
        startTime,
        endTime,
      });

      const slotCap = MAX_STUDENTS_PER_SESSION;
      if (existingBookingsCount >= slotCap) {
        throw slotFullError(slotCap);
      }

      // Generate meeting details
      const meetingDetails = this.generateMeetingUrl();

      // Determine session type based on existing bookings
      const sessionType = existingBookingsCount > 0 ? "group" : "one_on_one";

      // Calculate pricing
      const hourlyRate = availability.hourlyRate;
      let calculatedAmount = 0;

      if (
        hourlyRate &&
        typeof hourlyRate.amount === "number" &&
        !isNaN(hourlyRate.amount) &&
        hourlyRate.amount >= 0
      ) {
        calculatedAmount = hourlyRate.amount * (duration / 60);
      }

      // Ensure the amount is not NaN and is a valid number
      if (isNaN(calculatedAmount) || !isFinite(calculatedAmount)) {
        calculatedAmount = 0;
      }

      // Round to 2 decimal places
      calculatedAmount = Math.round(calculatedAmount * 100) / 100;

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
        status: "pending",
        sessionType,
        topics: topics || [],
        studentNotes: notes,
        meetingDetails,
        pricing: {
          amount: calculatedAmount,
          currency:
            (availability.hourlyRate && availability.hourlyRate.currency) ||
            "USD",
          paymentStatus: calculatedAmount > 0 ? "pending" : "free",
        },
      });

      try {
        await booking.save();
      } catch (saveError) {
        logger.error("Error saving booking", {
          error: saveError.message,
          bookingId: booking?._id,
        });
        throw saveError;
      }

      const occupyingAfterSave = await countOccupyingStudents({
        tutorId,
        sessionDate: date,
        startTime,
        endTime,
      });
      if (occupyingAfterSave > slotCap) {
        const keepers = await BookingSession.find(
          occupyingQuery({ tutorId, sessionDate: date, startTime, endTime }),
        )
          .sort({ createdAt: 1 })
          .limit(slotCap)
          .select("_id");
        const keepIds = new Set(keepers.map((doc) => doc._id.toString()));
        if (!keepIds.has(booking._id.toString())) {
          await BookingSession.deleteOne({ _id: booking._id });
          throw slotFullError(slotCap);
        }
      }

      // Increment mentorship session count for subscription tracking
      if (courseId) {
        try {
          await SubscriptionService.incrementMentorshipSession(studentId, courseId);
          logger.info(`Mentorship session incremented for student ${studentId}, course ${courseId}`);
        } catch (sessionError) {
          // Log but don't fail the booking - session tracking is secondary
          logger.warn(`Failed to increment mentorship session: ${sessionError.message}`, {
            studentId,
            courseId,
            bookingId: booking._id,
          });
        }
      }

      // Occupancy is the live BookingSession count, not availability.currentBookings.

      const populatedBooking = await BookingSession.findById(booking._id)
        .populate("studentId", "firstName lastName email")
        .populate("tutorId", "firstName lastName email")
        .populate("courseId", "title");

      if (!populatedBooking) {
        logger.warn("Booking not found after save; returning basic booking", {
          bookingId: booking._id,
        });
        return booking;
      }

      // Send email notifications
      try {
        const { googleCalendarUrl } = calendarLinksForBooking(populatedBooking, {
          otherPartyName: `${populatedBooking.tutorId.firstName} ${populatedBooking.tutorId.lastName}`,
          role: "user",
        });

        const sessionDetails = {
          bookingId: populatedBooking._id.toString(),
          date: new Date(populatedBooking.sessionDate).toLocaleDateString(),
          startTime: populatedBooking.startTime,
          endTime: populatedBooking.endTime,
          duration: populatedBooking.duration,
          sessionType: populatedBooking.sessionType,
          status: populatedBooking.status,
          studentNotes: populatedBooking.studentNotes,
          timezone: populatedBooking.timezone,
          googleCalendarUrl,
          dashboardUrl: dashboardSessionUrl({
            bookingId: populatedBooking._id,
            role: "user",
          }),
        };

        // Send confirmation email to student
        await sendSessionBookingStudentEmail(
          populatedBooking.studentId.email,
          populatedBooking.studentId.firstName,
          `${populatedBooking.tutorId.firstName} ${populatedBooking.tutorId.lastName}`,
          sessionDetails,
        );

        // Send notification email to tutor
        await sendSessionBookingTutorEmail(
          populatedBooking.tutorId.email,
          `${populatedBooking.tutorId.firstName} ${populatedBooking.tutorId.lastName}`,
          `${populatedBooking.studentId.firstName} ${populatedBooking.studentId.lastName}`,
          {
            ...sessionDetails,
            dashboardUrl: dashboardSessionUrl({
              bookingId: populatedBooking._id,
              role: "tutor",
            }),
            googleCalendarUrl: calendarLinksForBooking(populatedBooking, {
              otherPartyName: `${populatedBooking.studentId.firstName} ${populatedBooking.studentId.lastName}`,
              role: "tutor",
            }).googleCalendarUrl,
          },
        );

        const adminEmails = resolveBookingAdminEmails();
        if (adminEmails.length) {
          Promise.allSettled(
            adminEmails.map((adminEmail) =>
              sendSessionBookingAdminEmail(
                adminEmail,
                `${populatedBooking.studentId.firstName} ${populatedBooking.studentId.lastName}`,
                `${populatedBooking.tutorId.firstName} ${populatedBooking.tutorId.lastName}`,
                sessionDetails,
              ),
            ),
          ).catch((err) => {
            logger.warn("Admin booking notification failed", {
              error: err?.message || String(err),
              bookingId: booking._id,
            });
          });
        }
      } catch (emailError) {
        logger.error("Error sending booking notification emails", {
          error: emailError?.message || String(emailError),
          bookingId: booking._id,
        });
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
      throw new Error(
        `Invalid duration calculated from ${startTime} to ${endTime}`,
      );
    }

    return duration;
  }

  // Get user's bookings (updated to match controller expectations)
  async getUserBookings(userId, options = {}) {
    try {
      const { status, page = 1, limit = 10, type } = options;

      // Determine if user is student or tutor based on type or user role
      let query = {};
      if (type === "student") {
        query.studentId = userId;
      } else if (type === "tutor") {
        query.tutorId = userId;
      } else {
        // Auto-detect based on user role
        const user = await User.findById(userId);

        if (user && ["admin", "tutor", "super admin"].includes(user.role)) {
          query.tutorId = userId;
        } else {
          query.studentId = userId;
        }
      }

      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;
      const bookings = await BookingSession.find(query)
        .populate("studentId", "firstName lastName email profilePic")
        .populate("tutorId", "firstName lastName email profilePic headline")
        .populate(
          "courseId",
          "title description thumbnail level category price",
        )
        .sort({ sessionDate: -1, startTime: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await BookingSession.countDocuments(query);

      // Look up courses taught by each tutor
      const enrichedBookings = await Promise.all(
        bookings.map(async (booking) => {
          const bookingObj = booking.toObject();
          try {
            const tutorId = booking.tutorId?._id || booking.tutorId;
            const tutorCourses = await Course.find({
              $or: [{ instructor: tutorId }, { assistants: tutorId }],
              isActive: true,
            }).select("_id title category level price thumbnail description");

            bookingObj.tutorCourses = tutorCourses || [];
          } catch (err) {
            logger.warn(`Failed to get courses for tutor: ${err.message}`);
            bookingObj.tutorCourses = [];
          }
          return bookingObj;
        }),
      );

      return {
        bookings: enrichedBookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
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

      const actor = await User.findById(userId).select("role");
      const isStudent = booking.studentId.toString() === userId;
      const isTutor = booking.tutorId.toString() === userId;
      const isAdmin = actor && ["admin", "super admin"].includes(actor.role);
      const kind = actorKind({ isStudent, isTutor, isAdmin });

      if (!kind) {
        throw deny("Access denied");
      }

      assertStatusTransition(kind, booking.status, status);

      const noteBag =
        typeof notes === "string"
          ? { cancellationReason: notes }
          : notes || {};

      booking.status = status;

      if (noteBag.tutorNotes && (isTutor || isAdmin)) {
        booking.tutorNotes = noteBag.tutorNotes;
      }

      if (noteBag.sessionNotes && (isTutor || isAdmin)) {
        booking.sessionNotes = noteBag.sessionNotes;
      }

      if (status === "cancelled") {
        booking.cancellationReason =
          noteBag.cancellationReason || noteBag.reason || booking.cancellationReason;
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

      if (status === "cancelled") {
        if (booking.courseId) {
          try {
            await SubscriptionService.decrementMentorshipSession(
              booking.studentId.toString(),
              booking.courseId.toString()
            );
            logger.info(`Mentorship session decremented for status update to cancelled`, {
              studentId: booking.studentId,
              courseId: booking.courseId,
              bookingId: booking._id,
            });
          } catch (sessionError) {
            logger.warn(`Failed to decrement mentorship session: ${sessionError.message}`, {
              studentId: booking.studentId,
              courseId: booking.courseId,
              bookingId: booking._id,
            });
          }
        }

        await this.updateGroupSessionType(
          booking.tutorId,
          booking.sessionDate,
          booking.startTime,
          booking.endTime,
        );
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
        .populate("studentId", "firstName lastName email profilePic")
        .populate("tutorId", "firstName lastName email profilePic headline")
        .populate(
          "courseId",
          "title description thumbnail level category price",
        );

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

      const actor = await User.findById(userId).select("role");
      const isStudent = booking.studentId.toString() === userId;
      const isTutor = booking.tutorId.toString() === userId;
      const isAdmin = actor && ["admin", "super admin"].includes(actor.role);
      const kind = actorKind({ isStudent, isTutor, isAdmin });

      if (!kind) {
        throw deny("Access denied");
      }

      assertStatusTransition(kind, booking.status, "cancelled");

      // Update booking status
      booking.status = "cancelled";
      booking.cancellationReason = reason;
      booking.cancelledBy = userId;
      booking.cancelledAt = new Date();

      await booking.save();

      // Decrement mentorship session count for subscription tracking
      if (booking.courseId) {
        try {
          await SubscriptionService.decrementMentorshipSession(
            booking.studentId.toString(),
            booking.courseId.toString()
          );
          logger.info(`Mentorship session decremented for cancelled booking`, {
            studentId: booking.studentId,
            courseId: booking.courseId,
            bookingId: booking._id,
          });
        } catch (sessionError) {
          // Log but don't fail - session tracking is secondary
          logger.warn(`Failed to decrement mentorship session: ${sessionError.message}`, {
            studentId: booking.studentId,
            courseId: booking.courseId,
            bookingId: booking._id,
          });
        }
      }

      // Update group session type if needed
      await this.updateGroupSessionType(
        booking.tutorId,
        booking.sessionDate,
        booking.startTime,
        booking.endTime,
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

      const booking = await BookingSession.findById(bookingId);

      if (!booking) {
        throw new Error("Booking not found");
      }

      const actor = await User.findById(userId);
      const isTutor = booking.tutorId.toString() === userId;
      const isAdmin = actor && ["admin", "super admin"].includes(actor.role);

      if (!isTutor && !isAdmin) {
        const error = new Error(
          "Only tutors can reschedule sessions. Message your tutor to request a new time.",
        );
        error.statusCode = 403;
        throw error;
      }

      // Check if tutor is available at the new time
      const dayOfWeek = new Date(date)
        .toLocaleDateString("en-US", {
          weekday: "long",
        })
        .toLowerCase();

      const availability = await TutorAvailability.findOne({
        tutorId: booking.tutorId,
        dayOfWeek,
        isActive: true,
      });

      if (!availability) {
        throw new Error("Tutor is not available on the requested day");
      }

      // Check if the specific time slot is available
      const availableSlot = availability.timeSlots.find((slot) => {
        const timeOverlap = this.isTimeConflict(
          startTime,
          endTime,
          slot.startTime,
          slot.endTime,
        );
        return slot.isAvailable && timeOverlap;
      });

      if (!availableSlot) {
        throw new Error("Tutor is not available at the requested time slot");
      }

      assertMinimumLeadTime(date, startTime, availability.timezone || "UTC");

      const existingBookingsCount = await countOccupyingStudents({
        tutorId: booking.tutorId,
        sessionDate: date,
        startTime,
        endTime,
        excludeBookingId: bookingId,
      });

      const slotCap = MAX_STUDENTS_PER_SESSION;
      if (existingBookingsCount >= slotCap) {
        throw slotFullError(slotCap);
      }

      const previous = {
        sessionDate: booking.sessionDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        timezone: booking.timezone,
        status: booking.status,
      };

      // Update booking
      booking.sessionDate = date;
      booking.startTime = startTime;
      booking.endTime = endTime;
      booking.timezone = availability.timezone || booking.timezone;
      booking.status = "confirmed";
      booking.rescheduleReason = reason;
      booking.rescheduledBy = userId;
      booking.rescheduledAt = new Date();
      booking.reminders = {
        sent2days: { student: false, tutor: false },
        sent1day: { student: false, tutor: false },
        sent1hour: { student: false, tutor: false },
        sent10min: { student: false, tutor: false },
        sent30min: { student: false, tutor: false },
        sent15min: { student: false, tutor: false },
        reminderSentAt: null,
      };

      await booking.save();

      const occupyingAfterMove = await countOccupyingStudents({
        tutorId: booking.tutorId,
        sessionDate: date,
        startTime,
        endTime,
      });
      if (occupyingAfterMove > slotCap) {
        booking.sessionDate = previous.sessionDate;
        booking.startTime = previous.startTime;
        booking.endTime = previous.endTime;
        booking.timezone = previous.timezone;
        booking.status = previous.status;
        await booking.save();
        throw slotFullError(slotCap);
      }

      const populatedBooking = await BookingSession.findById(bookingId)
        .populate("studentId", "firstName lastName email")
        .populate("tutorId", "firstName lastName email")
        .populate("courseId", "title");

      try {
        const student = populatedBooking.studentId;
        const tutor = populatedBooking.tutorId;
        const studentName = `${student.firstName} ${student.lastName}`.trim();
        const tutorName = `${tutor.firstName} ${tutor.lastName}`.trim();
        const { googleCalendarUrl } = calendarLinksForBooking(
          populatedBooking,
          { otherPartyName: tutorName, role: "user" },
        );
        const sessionDetails = {
          date: new Date(populatedBooking.sessionDate).toLocaleDateString(),
          startTime: populatedBooking.startTime,
          endTime: populatedBooking.endTime,
          timezone: populatedBooking.timezone,
          reason: reason || "",
          googleCalendarUrl,
          dashboardUrl: dashboardSessionUrl({
            bookingId: populatedBooking._id,
            role: "user",
          }),
        };

        await sendSessionRescheduledEmail({
          recipientEmail: student.email,
          recipientName: studentName,
          otherPartyName: tutorName,
          role: "student",
          sessionDetails,
        });
        await sendSessionRescheduledEmail({
          recipientEmail: tutor.email,
          recipientName: tutorName,
          otherPartyName: studentName,
          role: "tutor",
          sessionDetails: {
            ...sessionDetails,
            dashboardUrl: dashboardSessionUrl({
              bookingId: populatedBooking._id,
              role: "tutor",
            }),
            googleCalendarUrl: calendarLinksForBooking(populatedBooking, {
              otherPartyName: studentName,
              role: "tutor",
            }).googleCalendarUrl,
          },
        });
      } catch (emailError) {
        logger.error("Error sending reschedule emails", {
          error: emailError?.message || String(emailError),
          bookingId,
        });
      }

      return populatedBooking;
    } catch (error) {
      throw error;
    }
  }

  // Complete session - supports both booking session ID and time slot ID
  async completeSession(bookingId, tutorId, notes) {
    try {
      // First, try to find as a booking session
      let booking = await BookingSession.findById(bookingId);

      if (booking) {
        // Found as booking session - use original logic
        if (booking.tutorId.toString() !== tutorId) {
          throw new Error("Only the assigned tutor can complete the session");
        }

        if (!["confirmed", "waiting"].includes(booking.status)) {
          throw new Error("Only confirmed or waiting bookings can be completed");
        }

        booking.status = "completed";
        booking.completedAt = new Date();
        booking.sessionNotes = notes;

        await booking.save();

        return await BookingSession.findById(bookingId)
          .populate("studentId", "firstName lastName email")
          .populate("tutorId", "firstName lastName email")
          .populate("courseId", "title");
      }

      // Not found as booking - try as time slot ID
      const availability = await TutorAvailability.findOne({
        "timeSlots._id": bookingId,
      });

      if (!availability) {
        throw new Error("Booking or time slot not found");
      }

      // Verify tutor owns this availability
      if (availability.tutorId.toString() !== tutorId) {
        throw new Error(
          "Only the assigned tutor can complete sessions for this time slot",
        );
      }

      // Find the specific time slot
      const timeSlot = availability.timeSlots.find(
        (slot) => slot._id.toString() === bookingId,
      );

      if (!timeSlot) {
        throw new Error("Time slot not found");
      }

      // Build query to find matching booking sessions
      // Match by tutor, time range, and confirmed status
      const query = {
        tutorId: availability.tutorId,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
        status: "confirmed",
      };

      // If availability has a specific date, match that date
      if (availability.specificDate) {
        const startOfDay = new Date(availability.specificDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(availability.specificDate);
        endOfDay.setHours(23, 59, 59, 999);

        query.sessionDate = {
          $gte: startOfDay,
          $lte: endOfDay,
        };
      }

      // Use updateMany for optimal bulk update
      const updateResult = await BookingSession.updateMany(query, {
        $set: {
          status: "completed",
          completedAt: new Date(),
          sessionNotes: notes || "",
        },
      });

      if (updateResult.matchedCount === 0) {
        throw new Error(
          "No confirmed booking sessions found for this time slot",
        );
      }

      // Return updated sessions with populated fields
      const completedSessions = await BookingSession.find({
        tutorId: availability.tutorId,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
        status: "completed",
        completedAt: { $gte: new Date(Date.now() - 5000) }, // Sessions completed in last 5 seconds
      })
        .populate("studentId", "firstName lastName email")
        .populate("tutorId", "firstName lastName email")
        .populate("courseId", "title");

      return completedSessions.length === 1
        ? completedSessions[0]
        : completedSessions;
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
        maxParticipants: MAX_STUDENTS_PER_SESSION,
        availableSlots: Math.max(
          0,
          MAX_STUDENTS_PER_SESSION - participants.length,
        ),
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
        { sessionType: newSessionType },
      );

      return newSessionType;
    } catch (error) {
      throw error;
    }
  }

  // Helper method to generate time slots within a time block
  generateTimeSlots(startTime, endTime, sessionDuration) {
    const slots = [];

    // Convert time strings to minutes
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

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
    }
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
        sessionDuration,
      );

      if (!timeSlots[timeSlotIndex]) {
        throw new Error("Time slot index not found");
      }

      const specificTimeSlot = timeSlots[timeSlotIndex];

      const cap = MAX_STUDENTS_PER_SESSION;
      const occupied = await countOccupyingStudents({
        tutorId: availability.tutorId._id,
        sessionDate,
        startTime: specificTimeSlot.startTime,
        endTime: specificTimeSlot.endTime,
      });

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
        availableSlots: Math.max(0, cap - occupied),
        totalSlots: cap,
        pricing: availability.hourlyRate || { amount: 0, currency: "USD" },
        course: availability.courseSpecific,
        timezone: availability.timezone,
        description: availability.description,
      };
    } catch (error) {
      throw new Error(`Failed to get session slot details: ${error.message}`);
    }
  }

  async markOverdueSessionsAsMissed() {
    const now = moment();
    const sessions = await BookingSession.find({
      status: { $in: ["pending", "confirmed"] },
      sessionDate: {
        $gte: now.clone().subtract(3, "days").startOf("day").toDate(),
        $lte: now.clone().endOf("day").toDate(),
      },
    });

    let marked = 0;
    for (const session of sessions) {
      const timezone = session.timezone || "UTC";
      const dateStr = moment(session.sessionDate).format("YYYY-MM-DD");
      const start = moment.tz(
        `${dateStr} ${session.startTime}`,
        "YYYY-MM-DD HH:mm",
        timezone,
      );
      let end = moment.tz(
        `${dateStr} ${session.endTime}`,
        "YYYY-MM-DD HH:mm",
        timezone,
      );
      if (end.isValid() && start.isValid() && !end.isAfter(start)) {
        end = end.add(1, "day");
      }
      if (!end.isValid()) continue;
      if (now.isAfter(end.clone().add(15, "minutes"))) {
        const snap = attendanceSnapshot(session);
        if (snap.state === "attended") {
          session.status = "completed";
          session.completedAt = session.completedAt || new Date();
        } else if (snap.state === "waiting") {
          session.status = "waiting";
        } else {
          session.status = "no_show";
        }
        await session.save();
        marked += 1;
      }
    }
    return marked;
  }

  async joinSession(bookingId, userId) {
    const booking = await BookingSession.findById(bookingId);
    if (!booking) {
      throw deny("Booking not found", 404);
    }

    const isStudent = booking.studentId.toString() === userId;
    const isTutor = booking.tutorId.toString() === userId;
    if (!isStudent && !isTutor) {
      throw deny("Access denied");
    }

    if (!["pending", "confirmed", "waiting"].includes(booking.status)) {
      throw deny("This session can no longer be joined", 400);
    }

    if (!booking.attendance) booking.attendance = {};
    const now = new Date();
    if (isStudent && !booking.attendance.studentJoinedAt) {
      booking.attendance.studentJoinedAt = now;
    }
    if (isTutor && !booking.attendance.tutorJoinedAt) {
      booking.attendance.tutorJoinedAt = now;
    }
    booking.markModified("attendance");
    await booking.save();

    const snap = attendanceSnapshot(booking);
    return {
      meetingUrl: booking.meetingDetails?.meetingUrl,
      attendance: booking.attendance,
      attendanceState: snap.state,
    };
  }
}

export default new BookingService();
