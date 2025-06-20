import Joi from "joi";

// Registration validation
export const registerSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
});

// OTP verification validation
export const verifyOtpSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),
  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      "string.length": "OTP must be exactly 6 digits",
      "string.pattern.base": "OTP must contain only numbers",
      "any.required": "OTP is required",
    }),
});

// Set password validation
export const setPasswordSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters long",
      "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      "any.required": "Password is required",
    }),
  // confirmPassword: Joi.string()
  //   .valid(Joi.ref("password"))
  //   .required()
  //   .messages({
  //     "any.only": "Passwords do not match",
  //     "any.required": "Password confirmation is required",
  //   }),
});

// Login validation
export const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),
  password: Joi.string()
    .required()
    .messages({
      "any.required": "Password is required",
    }),
});

// Profile completion validation
export const profileSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      "string.min": "First name must be at least 2 characters",
      "string.max": "First name cannot exceed 50 characters",
      "any.required": "First name is required",
    }),
  lastName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      "string.min": "Last name must be at least 2 characters",
      "string.max": "Last name cannot exceed 50 characters",
      "any.required": "Last name is required",
    }),
  course: Joi.string()
    .required()
    .messages({
      "any.required": "Course selection is required",
    }),
  courseDuration: Joi.string()
    .required()
    .messages({
      "any.required": "Course duration is required",
    }),
  dateOfBirth: Joi.date()
    .max("now")
    .required()
    .messages({
      "date.max": "Date of birth cannot be in the future",
      "any.required": "Date of birth is required",
    }),
  placeOfBirth: Joi.string()
    .required()
    .messages({
      "any.required": "Place of birth is required",
    }),
  phone: Joi.string()
    .pattern(/^[+]?[1-9]\d{1,14}$/)
    .required()
    .messages({
      "string.pattern.base": "Please provide a valid phone number",
      "any.required": "Phone number is required",
    }),
  socialMedia: Joi.object({
    facebook: Joi.string().allow("").optional(),
    twitter: Joi.string().allow("").optional(),
    linkedin: Joi.string().allow("").optional(),
    instagram: Joi.string().allow("").optional(),
    other: Joi.string().allow("").optional(),
  }).optional(),
  deliveryAddress: Joi.object({
    address: Joi.string().required().messages({
      "any.required": "Address is required",
    }),
    city: Joi.string().required().messages({
      "any.required": "City is required",
    }),
    country: Joi.string().required().messages({
      "any.required": "Country is required",
    }),
    zipCode: Joi.string().required().messages({
      "any.required": "ZIP code is required",
    }),
  }).required(),
});
