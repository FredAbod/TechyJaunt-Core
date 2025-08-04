import Joi from "joi";

// Course creation validation for multipart/form-data
export const createCourseMultipartSchema = Joi.object({
  title: Joi.string().min(5).max(100).required().messages({
    "string.min": "Course title must be at least 5 characters",
    "string.max": "Course title cannot exceed 100 characters",
    "any.required": "Course title is required",
  }),
  description: Joi.string().min(20).max(2000).required().messages({
    "string.min": "Description must be at least 20 characters",
    "string.max": "Description cannot exceed 2000 characters",
    "any.required": "Course description is required",
  }),
  shortDescription: Joi.string().min(10).max(200).required().messages({
    "string.min": "Short description must be at least 10 characters",
    "string.max": "Short description cannot exceed 200 characters",
    "any.required": "Short description is required",
  }),
  category: Joi.string()
    .valid(
      "Web Development",
      "Mobile Development",
      "Data Science",
      "AI/Machine Learning",
      "DevOps",
      "Cybersecurity",
      "UI/UX Design",
      "Digital Marketing",
      "Other"
    )
    .required()
    .messages({
      "any.only": "Please select a valid category",
      "any.required": "Course category is required",
    }),
  level: Joi.string()
    .valid("Beginner", "Intermediate", "Advanced")
    .required()
    .messages({
      "any.only": "Please select a valid level",
      "any.required": "Course level is required",
    }),
  duration: Joi.string().required().messages({
    "any.required": "Course duration is required",
  }),
  price: Joi.number().min(0).required().messages({
    "number.min": "Price cannot be negative",
    "any.required": "Course price is required",
  }),
  originalPrice: Joi.number().min(0).optional(),
  prerequisites: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string()),
      Joi.string().custom((value, helpers) => {
        try {
          return JSON.parse(value);
        } catch (error) {
          return helpers.error("any.invalid");
        }
      })
    )
    .optional(),
  learningOutcomes: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string()),
      Joi.string().custom((value, helpers) => {
        try {
          const parsed = JSON.parse(value);
          if (!Array.isArray(parsed) || parsed.length === 0) {
            return helpers.error("array.min");
          }
          return parsed;
        } catch (error) {
          return helpers.error("any.invalid");
        }
      })
    )
    .required()
    .messages({
      "array.min": "At least one learning outcome is required",
      "any.required": "Learning outcomes are required",
    }),
  tags: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string()),
      Joi.string().custom((value, helpers) => {
        try {
          return JSON.parse(value);
        } catch (error) {
          return helpers.error("any.invalid");
        }
      })
    )
    .optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  maxStudents: Joi.number().min(1).optional(),
      image: Joi.string()
    .uri()
    .optional()
    .messages({
      "string.uri": "Image must be a valid URL",
      "any.required": "Course image is required",
    }),
});

// Course creation validation
export const createCourseSchema = Joi.object({
  title: Joi.string().min(5).max(100).required().messages({
    "string.min": "Course title must be at least 5 characters",
    "string.max": "Course title cannot exceed 100 characters",
    "any.required": "Course title is required",
  }),
  description: Joi.string().min(20).max(2000).required().messages({
    "string.min": "Description must be at least 20 characters",
    "string.max": "Description cannot exceed 2000 characters",
    "any.required": "Course description is required",
  }),
  shortDescription: Joi.string().min(10).max(200).required().messages({
    "string.min": "Short description must be at least 10 characters",
    "string.max": "Short description cannot exceed 200 characters",
    "any.required": "Short description is required",
  }),
  category: Joi.string()
    .valid(
      "Web Development",
      "Mobile Development",
      "Data Science",
      "AI/Machine Learning",
      "DevOps",
      "Cybersecurity",
      "UI/UX Design",
      "Digital Marketing",
      "Other"
    )
    .required()
    .messages({
      "any.only": "Please select a valid category",
      "any.required": "Course category is required",
    }),
  level: Joi.string()
    .valid("Beginner", "Intermediate", "Advanced")
    .required()
    .messages({
      "any.only": "Please select a valid level",
      "any.required": "Course level is required",
    }),
  duration: Joi.string().required().messages({
    "any.required": "Course duration is required",
  }),
  price: Joi.number().min(0).required().messages({
    "number.min": "Price cannot be negative",
    "any.required": "Course price is required",
  }),
  originalPrice: Joi.number().min(0).optional(),
  image: Joi.string().uri().required().messages({
    "string.uri": "Image must be a valid URL",
    "any.required": "Course image is required",
  }),
  thumbnail: Joi.string().uri().optional().messages({
    "string.uri": "Thumbnail must be a valid URL",
  }),
  prerequisites: Joi.array().items(Joi.string()).optional(),
  learningOutcomes: Joi.array().items(Joi.string()).min(1).required().messages({
    "array.min": "At least one learning outcome is required",
    "any.required": "Learning outcomes are required",
  }),
  tags: Joi.array().items(Joi.string()).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().greater(Joi.ref("startDate")).optional().messages({
    "date.greater": "End date must be after start date",
  }),
  maxStudents: Joi.number().min(1).optional(),
  image: Joi.string().uri().optional().messages({
    "string.uri": "Image must be a valid URL",
    "any.required": "Course image is required",
  }),
});

// Module creation validation
export const createModuleSchema = Joi.object({
  title: Joi.string().min(3).max(100).required().messages({
    "string.min": "Module title must be at least 3 characters",
    "string.max": "Module title cannot exceed 100 characters",
    "any.required": "Module title is required",
  }),
  description: Joi.string().min(10).max(1000).required().messages({
    "string.min": "Description must be at least 10 characters",
    "string.max": "Description cannot exceed 1000 characters",
    "any.required": "Module description is required",
  }),
  courseId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid course ID format",
      "any.required": "Course ID is required",
    }),
  order: Joi.number().min(1).required().messages({
    "number.min": "Module order must be at least 1",
    "any.required": "Module order is required",
  }),
  duration: Joi.string().optional(),
});

// Lesson creation validation
export const createLessonSchema = Joi.object({
  title: Joi.string().min(3).max(100).required().messages({
    "string.min": "Lesson title must be at least 3 characters",
    "string.max": "Lesson title cannot exceed 100 characters",
    "any.required": "Lesson title is required",
  }),
  description: Joi.string().max(1000).optional(),
  moduleId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid module ID format",
      "any.required": "Module ID is required",
    }),
  courseId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid course ID format",
      "any.required": "Course ID is required",
    }),
  order: Joi.number().min(1).required().messages({
    "number.min": "Lesson order must be at least 1",
    "any.required": "Lesson order is required",
  }),
  type: Joi.string()
    .valid("video", "text", "quiz", "assignment", "live")
    .required()
    .messages({
      "any.only": "Please select a valid lesson type",
      "any.required": "Lesson type is required",
    }),
  content: Joi.object({
    videoUrl: Joi.string().uri().optional(),
    videoDuration: Joi.number().min(0).optional(),
    textContent: Joi.string().optional(),
    assignmentInstructions: Joi.string().optional(),
    quizData: Joi.object().optional(),
  }).optional(),
  isFree: Joi.boolean().optional(),
});

// Course enrollment validation
export const enrollCourseSchema = Joi.object({
  courseId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid course ID format",
      "any.required": "Course ID is required",
    }),
});

// Lesson completion validation
export const completeLessonSchema = Joi.object({
  lessonId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid lesson ID format",
      "any.required": "Lesson ID is required",
    }),
  timeSpent: Joi.number().min(0).optional().messages({
    "number.min": "Time spent cannot be negative",
  }),
});

// Course rating validation
export const rateCourseSchema = Joi.object({
  courseId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid course ID format",
      "any.required": "Course ID is required",
    }),
  rating: Joi.number().min(1).max(5).required().messages({
    "number.min": "Rating must be at least 1",
    "number.max": "Rating cannot exceed 5",
    "any.required": "Rating is required",
  }),
  review: Joi.string().max(1000).optional().messages({
    "string.max": "Review cannot exceed 1000 characters",
  }),
});

// Pre-recorded class validation
export const createPrerecordedClassSchema = Joi.object({
  title: Joi.string().min(5).max(150).required().messages({
    "string.min": "Class title must be at least 5 characters",
    "string.max": "Class title cannot exceed 150 characters",
    "any.required": "Class title is required",
  }),
  description: Joi.string().min(20).max(2000).required().messages({
    "string.min": "Class description must be at least 20 characters",
    "string.max": "Class description cannot exceed 2000 characters",
    "any.required": "Class description is required",
  }),
  courseId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid course ID format",
      "any.required": "Course ID is required",
    }),
  moduleId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      "string.pattern.base": "Invalid module ID format",
    }),
  level: Joi.string().valid("Beginner", "Intermediate", "Advanced").optional(),
  order: Joi.number().integer().min(0).optional().default(0),
  tags: Joi.array().items(Joi.string()).optional(),
  transcript: Joi.string().optional(),
});

// Update pre-recorded class validation
export const updatePrerecordedClassSchema = Joi.object({
  title: Joi.string().min(5).max(150).optional(),
  description: Joi.string().min(20).max(2000).optional(),
  level: Joi.string().valid("Beginner", "Intermediate", "Advanced").optional(),
  order: Joi.number().integer().min(0).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  transcript: Joi.string().optional(),
  isPublished: Joi.boolean().optional(),
});

// Class resource validation
export const uploadResourceSchema = Joi.object({
  title: Joi.string().min(3).max(100).required().messages({
    "string.min": "Resource title must be at least 3 characters",
    "string.max": "Resource title cannot exceed 100 characters",
    "any.required": "Resource title is required",
  }),
  description: Joi.string().max(500).optional(),
  courseId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid course ID format",
      "any.required": "Course ID is required",
    }),
  classId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid class ID format",
      "any.required": "Class ID is required",
    }),
  classType: Joi.string()
    .valid("PrerecordedClass", "LiveClass")
    .required()
    .messages({
      "any.only": "Class type must be PrerecordedClass or LiveClass",
      "any.required": "Class type is required",
    }),
  category: Joi.string()
    .valid(
      "lecture_notes",
      "assignment",
      "reading_material",
      "code_samples",
      "presentation",
      "worksheet",
      "reference",
      "other"
    )
    .optional()
    .default("other"),
  accessLevel: Joi.string()
    .valid("free", "premium", "enrolled_only")
    .optional()
    .default("enrolled_only"),
  tags: Joi.array().items(Joi.string()).optional(),
});

// Assessment validation schemas
export const createAssessmentSchema = Joi.object({
  title: Joi.string().min(5).max(100).required().messages({
    "string.min": "Assessment title must be at least 5 characters",
    "string.max": "Assessment title cannot exceed 100 characters",
    "any.required": "Assessment title is required",
  }),
  description: Joi.string().min(10).max(500).optional().messages({
    "string.min": "Description must be at least 10 characters",
    "string.max": "Description cannot exceed 500 characters",
  }),
  moduleId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid module ID format",
      "any.required": "Module ID is required",
    }),
  courseId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid course ID format",
      "any.required": "Course ID is required",
    }),
  questions: Joi.array()
    .items(
      Joi.object({
        question: Joi.string().min(10).max(500).required().messages({
          "string.min": "Question must be at least 10 characters",
          "string.max": "Question cannot exceed 500 characters",
          "any.required": "Question text is required",
        }),
        options: Joi.array()
          .items(
            Joi.object({
              text: Joi.string().min(1).max(200).required().messages({
                "string.min": "Option text cannot be empty",
                "string.max": "Option text cannot exceed 200 characters",
                "any.required": "Option text is required",
              }),
              isCorrect: Joi.boolean().required().messages({
                "any.required": "Option correctness must be specified",
              }),
            })
          )
          .min(2)
          .max(6)
          .required()
          .messages({
            "array.min": "Each question must have at least 2 options",
            "array.max": "Each question cannot have more than 6 options",
            "any.required": "Question options are required",
          }),
        explanation: Joi.string().max(300).optional().messages({
          "string.max": "Explanation cannot exceed 300 characters",
        }),
      })
    )
    .min(5)
    .max(20)
    .required()
    .messages({
      "array.min": "Assessment must have at least 5 questions",
      "array.max": "Assessment cannot have more than 20 questions",
      "any.required": "Questions are required",
    }),
  passingScore: Joi.number().min(0).max(100).optional().default(70).messages({
    "number.min": "Passing score cannot be negative",
    "number.max": "Passing score cannot exceed 100",
  }),
  timeLimit: Joi.number().min(5).max(180).optional().default(30).messages({
    "number.min": "Time limit must be at least 5 minutes",
    "number.max": "Time limit cannot exceed 180 minutes",
  }),
  attemptsAllowed: Joi.number().min(1).max(10).optional().default(3).messages({
    "number.min": "At least 1 attempt must be allowed",
    "number.max": "Cannot allow more than 10 attempts",
  }),
});

export const updateAssessmentSchema = Joi.object({
  title: Joi.string().min(5).max(100).optional().messages({
    "string.min": "Assessment title must be at least 5 characters",
    "string.max": "Assessment title cannot exceed 100 characters",
  }),
  description: Joi.string().min(10).max(500).optional().messages({
    "string.min": "Description must be at least 10 characters",
    "string.max": "Description cannot exceed 500 characters",
  }),
  questions: Joi.array()
    .items(
      Joi.object({
        question: Joi.string().min(10).max(500).required().messages({
          "string.min": "Question must be at least 10 characters",
          "string.max": "Question cannot exceed 500 characters",
          "any.required": "Question text is required",
        }),
        options: Joi.array()
          .items(
            Joi.object({
              text: Joi.string().min(1).max(200).required().messages({
                "string.min": "Option text cannot be empty",
                "string.max": "Option text cannot exceed 200 characters",
                "any.required": "Option text is required",
              }),
              isCorrect: Joi.boolean().required().messages({
                "any.required": "Option correctness must be specified",
              }),
            })
          )
          .min(2)
          .max(6)
          .required()
          .messages({
            "array.min": "Each question must have at least 2 options",
            "array.max": "Each question cannot have more than 6 options",
            "any.required": "Question options are required",
          }),
        explanation: Joi.string().max(300).optional().messages({
          "string.max": "Explanation cannot exceed 300 characters",
        }),
      })
    )
    .min(5)
    .max(20)
    .optional()
    .messages({
      "array.min": "Assessment must have at least 5 questions",
      "array.max": "Assessment cannot have more than 20 questions",
    }),
  passingScore: Joi.number().min(0).max(100).optional().messages({
    "number.min": "Passing score cannot be negative",
    "number.max": "Passing score cannot exceed 100",
  }),
  timeLimit: Joi.number().min(5).max(180).optional().messages({
    "number.min": "Time limit must be at least 5 minutes",
    "number.max": "Time limit cannot exceed 180 minutes",
  }),
  attemptsAllowed: Joi.number().min(1).max(10).optional().messages({
    "number.min": "At least 1 attempt must be allowed",
    "number.max": "Cannot allow more than 10 attempts",
  }),
});

export const submitAssessmentSchema = Joi.object({
  answers: Joi.array()
    .items(
      Joi.object({
        questionId: Joi.string()
          .pattern(/^[0-9a-fA-F]{24}$/)
          .required()
          .messages({
            "string.pattern.base": "Invalid question ID format",
            "any.required": "Question ID is required",
          }),
        selectedOptionId: Joi.string()
          .pattern(/^[0-9a-fA-F]{24}$/)
          .required()
          .messages({
            "string.pattern.base": "Invalid option ID format",
            "any.required": "Selected option ID is required",
          }),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one answer is required",
      "any.required": "Answers are required",
    }),
});

// Progress validation schemas
export const updateVideoProgressSchema = Joi.object({
  watchTime: Joi.number().min(0).required().messages({
    "number.min": "Watch time cannot be negative",
    "any.required": "Watch time is required",
  }),
  totalDuration: Joi.number().min(1).required().messages({
    "number.min": "Total duration must be at least 1 second",
    "any.required": "Total duration is required",
  }),
});

export const initializeProgressSchema = Joi.object({
  subscriptionId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid subscription ID format",
      "any.required": "Subscription ID is required",
    }),
});
