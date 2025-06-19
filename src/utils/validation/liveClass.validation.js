import Joi from "joi";

// Schedule live class validation
export const scheduleLiveClassSchema = Joi.object({
  title: Joi.string()
    .min(5)
    .max(150)
    .required()
    .messages({
      "string.min": "Class title must be at least 5 characters",
      "string.max": "Class title cannot exceed 150 characters",
      "any.required": "Class title is required",
    }),
  description: Joi.string()
    .min(20)
    .max(1000)
    .required()
    .messages({
      "string.min": "Class description must be at least 20 characters",
      "string.max": "Class description cannot exceed 1000 characters",
      "any.required": "Class description is required",
    }),
  courseId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid course ID format",
      "any.required": "Course ID is required",
    }),
  scheduledDate: Joi.date()
    .min('now')
    .required()
    .messages({
      "date.min": "Scheduled date cannot be in the past",
      "any.required": "Scheduled date is required",
    }),
  duration: Joi.number()
    .integer()
    .min(15)
    .max(480) // 8 hours max
    .required()
    .messages({
      "number.min": "Class duration must be at least 15 minutes",
      "number.max": "Class duration cannot exceed 8 hours",
      "any.required": "Class duration is required",
    }),
  maxParticipants: Joi.number()
    .integer()
    .min(1)
    .max(500)
    .optional()
    .default(100),
});

// Update live class validation
export const updateLiveClassSchema = Joi.object({
  title: Joi.string()
    .min(5)
    .max(150)
    .optional(),
  description: Joi.string()
    .min(20)
    .max(1000)
    .optional(),
  scheduledDate: Joi.date()
    .min('now')
    .optional(),
  duration: Joi.number()
    .integer()
    .min(15)
    .max(480)
    .optional(),
  maxParticipants: Joi.number()
    .integer()
    .min(1)
    .max(500)
    .optional(),
  status: Joi.string()
    .valid("scheduled", "live", "completed", "cancelled")
    .optional(),
});

// Join live class validation
export const joinLiveClassSchema = Joi.object({
  classId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid class ID format",
      "any.required": "Class ID is required",
    }),
});

// Add comment validation
export const addCommentSchema = Joi.object({
  message: Joi.string()
    .min(1)
    .max(500)
    .required()
    .messages({
      "string.min": "Comment cannot be empty",
      "string.max": "Comment cannot exceed 500 characters",
      "any.required": "Comment message is required",
    }),
  replyTo: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      "string.pattern.base": "Invalid reply comment ID format",
    }),
});

// Upload material validation
export const uploadMaterialSchema = Joi.object({
  title: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      "string.min": "Material title must be at least 3 characters",
      "string.max": "Material title cannot exceed 100 characters",
      "any.required": "Material title is required",
    }),
});
