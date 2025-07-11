import Joi from "joi";

// Set tutor availability validation
export const setAvailabilitySchema = Joi.object({
  dayOfWeek: Joi.string()
    .valid("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")
    .required()
    .messages({
      "any.only": "Day of week must be a valid day (monday-sunday)",
      "any.required": "Day of week is required",
    }),
  timeSlots: Joi.array()
    .items(
      Joi.object({
        startTime: Joi.string()
          .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .required()
          .messages({
            "string.pattern.base": "Start time must be in HH:MM format (24-hour)",
            "any.required": "Start time is required",
          }),
        endTime: Joi.string()
          .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .required()
          .messages({
            "string.pattern.base": "End time must be in HH:MM format (24-hour)",
            "any.required": "End time is required",
          }),
        sessionDuration: Joi.number()
          .integer()
          .min(15)
          .max(480)
          .optional()
          .default(60)
          .messages({
            "number.min": "Session duration must be at least 15 minutes",
            "number.max": "Session duration cannot exceed 8 hours",
          }),
        maxBookings: Joi.number()
          .integer()
          .min(1)
          .max(10)
          .optional()
          .default(1)
          .messages({
            "number.min": "Max bookings must be at least 1",
            "number.max": "Max bookings cannot exceed 10",
          }),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one time slot is required",
      "any.required": "Time slots are required",
    }),
  timezone: Joi.string()
    .optional()
    .default("UTC"),
  isRecurring: Joi.boolean()
    .optional()
    .default(true),
  specificDate: Joi.date()
    .min('now')
    .optional()
    .messages({
      "date.min": "Specific date cannot be in the past",
    }),
  courseSpecific: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      "string.pattern.base": "Invalid course ID format",
    }),
  hourlyRate: Joi.object({
    amount: Joi.number()
      .min(0)
      .optional()
      .default(0),
    currency: Joi.string()
      .optional()
      .default("USD"),
  }).optional(),
  description: Joi.string()
    .max(500)
    .optional()
    .messages({
      "string.max": "Description cannot exceed 500 characters",
    }),
});

// Book session validation
export const bookSessionSchema = Joi.object({
  tutorId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      "string.pattern.base": "Invalid tutor ID format",
      "any.required": "Tutor ID is required",
    }),
  courseId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      "string.pattern.base": "Invalid course ID format",
    }),
  sessionDate: Joi.date()
    .min('now')
    .required()
    .messages({
      "date.min": "Session date cannot be in the past",
      "any.required": "Session date is required",
    }),
  startTime: Joi.string()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required()
    .messages({
      "string.pattern.base": "Start time must be in HH:MM format (24-hour)",
      "any.required": "Start time is required",
    }),
  duration: Joi.number()
    .integer()
    .min(15)
    .max(480)
    .required()
    .messages({
      "number.min": "Session duration must be at least 15 minutes",
      "number.max": "Session duration cannot exceed 8 hours",
      "any.required": "Session duration is required",
    }),
  sessionType: Joi.string()
    .valid("one_on_one", "group", "consultation", "review")
    .optional()
    .default("one_on_one"),
  topics: Joi.array()
    .items(Joi.string())
    .optional(),
  studentNotes: Joi.string()
    .max(1000)
    .optional()
    .messages({
      "string.max": "Student notes cannot exceed 1000 characters",
    }),
  timezone: Joi.string()
    .required()
    .messages({
      "any.required": "Timezone is required",
    }),
});

// Update booking validation
export const updateBookingSchema = Joi.object({
  status: Joi.string()
    .valid("pending", "confirmed", "cancelled", "completed", "no_show")
    .optional(),
  tutorNotes: Joi.string()
    .max(1000)
    .optional()
    .messages({
      "string.max": "Tutor notes cannot exceed 1000 characters",
    }),
  sessionNotes: Joi.string()
    .max(2000)
    .optional()
    .messages({
      "string.max": "Session notes cannot exceed 2000 characters",
    }),
  cancellationReason: Joi.string()
    .max(500)
    .optional()
    .messages({
      "string.max": "Cancellation reason cannot exceed 500 characters",
    }),
});

// Session feedback validation
export const sessionFeedbackSchema = Joi.object({
  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
    .messages({
      "number.min": "Rating must be at least 1",
      "number.max": "Rating cannot exceed 5",
      "any.required": "Rating is required",
    }),
  comment: Joi.string()
    .max(1000)
    .optional()
    .messages({
      "string.max": "Comment cannot exceed 1000 characters",
    }),
});

// Book session by slot ID validation (easier for users)
export const bookSessionBySlotSchema = Joi.object({
  sessionId: Joi.string()
    .required()
    .messages({
      "any.required": "Session ID is required",
    }),
  courseId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      "string.pattern.base": "Invalid course ID format",
    }),
  topics: Joi.array()
    .items(Joi.string().max(100))
    .max(10)
    .optional()
    .messages({
      "array.max": "Maximum 10 topics allowed",
      "string.max": "Topic cannot exceed 100 characters",
    }),
  studentNotes: Joi.string()
    .max(500)
    .optional()
    .messages({
      "string.max": "Student notes cannot exceed 500 characters",
    }),
});

// Reschedule booking validation
export const rescheduleBookingSchema = Joi.object({
  sessionDate: Joi.date()
    .min('now')
    .required()
    .messages({
      "date.min": "Session date cannot be in the past",
      "any.required": "Session date is required",
    }),
  startTime: Joi.string()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required()
    .messages({
      "string.pattern.base": "Start time must be in HH:MM format (24-hour)",
      "any.required": "Start time is required",
    }),
  endTime: Joi.string()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional()
    .messages({
      "string.pattern.base": "End time must be in HH:MM format (24-hour)",
    }),
  duration: Joi.number()
    .integer()
    .min(15)
    .max(480)
    .optional()
    .messages({
      "number.min": "Session duration must be at least 15 minutes",
      "number.max": "Session duration cannot exceed 8 hours",
    }),
  reason: Joi.string()
    .max(500)
    .optional()
    .messages({
      "string.max": "Reason cannot exceed 500 characters",
    }),
  timezone: Joi.string()
    .optional()
    .default("UTC"),
});

// Get availability validation
export const getAvailabilitySchema = Joi.object({
  tutorId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      "string.pattern.base": "Invalid tutor ID format",
    }),
  courseId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      "string.pattern.base": "Invalid course ID format",
    }),
  date: Joi.date()
    .min('now')
    .optional()
    .messages({
      "date.min": "Date cannot be in the past",
    }),
  dayOfWeek: Joi.string()
    .valid("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")
    .optional(),
});