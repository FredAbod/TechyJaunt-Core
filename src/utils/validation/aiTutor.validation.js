import Joi from "joi";

// Topic explanation validation
export const topicExplanationSchema = Joi.object({
  topic: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Topic is required',
      'string.min': 'Topic must be at least 3 characters long',
      'string.max': 'Topic cannot exceed 200 characters',
      'any.required': 'Topic is required'
    }),
  
  userLevel: Joi.string()
    .valid('beginner', 'intermediate', 'advanced')
    .default('intermediate')
    .messages({
      'any.only': 'User level must be one of: beginner, intermediate, advanced'
    }),
  
  specificQuestions: Joi.array()
    .items(
      Joi.string()
        .trim()
        .min(5)
        .max(500)
        .messages({
          'string.min': 'Each question must be at least 5 characters long',
          'string.max': 'Each question cannot exceed 500 characters'
        })
    )
    .max(5)
    .default([])
    .messages({
      'array.max': 'Maximum 5 specific questions allowed'
    })
});

// Study plan generation validation
export const studyPlanSchema = Joi.object({
  topic: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Topic is required',
      'string.min': 'Topic must be at least 3 characters long',
      'string.max': 'Topic cannot exceed 200 characters',
      'any.required': 'Topic is required'
    }),
  
  duration: Joi.string()
    .valid('3 days', '1 week', '2 weeks', '1 month', '2 months', '3 months')
    .default('1 week')
    .messages({
      'any.only': 'Duration must be one of: 3 days, 1 week, 2 weeks, 1 month, 2 months, 3 months'
    }),
  
  goals: Joi.array()
    .items(
      Joi.string()
        .trim()
        .min(5)
        .max(200)
        .messages({
          'string.min': 'Each goal must be at least 5 characters long',
          'string.max': 'Each goal cannot exceed 200 characters'
        })
    )
    .max(10)
    .default([])
    .messages({
      'array.max': 'Maximum 10 learning goals allowed'
    })
});

// Question answering validation
export const questionAnswerSchema = Joi.object({
  question: Joi.string()
    .trim()
    .min(5)
    .max(1000)
    .required()
    .messages({
      'string.empty': 'Question is required',
      'string.min': 'Question must be at least 5 characters long',
      'string.max': 'Question cannot exceed 1000 characters',
      'any.required': 'Question is required'
    }),
  
  context: Joi.string()
    .trim()
    .max(2000)
    .allow('')
    .default('')
    .messages({
      'string.max': 'Context cannot exceed 2000 characters'
    }),
  
  userLevel: Joi.string()
    .valid('beginner', 'intermediate', 'advanced')
    .default('intermediate')
    .messages({
      'any.only': 'User level must be one of: beginner, intermediate, advanced'
    })
});

// Practice exercises validation
export const practiceExercisesSchema = Joi.object({
  topic: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Topic is required',
      'string.min': 'Topic must be at least 3 characters long',
      'string.max': 'Topic cannot exceed 200 characters',
      'any.required': 'Topic is required'
    }),
  
  difficulty: Joi.string()
    .valid('beginner', 'intermediate', 'advanced')
    .default('intermediate')
    .messages({
      'any.only': 'Difficulty must be one of: beginner, intermediate, advanced'
    }),
  
  count: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .default(3)
    .messages({
      'number.min': 'Exercise count must be at least 1',
      'number.max': 'Exercise count cannot exceed 10',
      'number.integer': 'Exercise count must be a whole number'
    })
});
