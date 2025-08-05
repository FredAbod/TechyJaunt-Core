import { createCourseMultipartSchema } from "../utils/validation/course.validation.js";

// Custom validation middleware for multipart form data
export const validateMultipartCourse = (req, res, next) => {
  try {
    // Parse JSON fields from strings
    const fieldsToParseAsJSON = ['prerequisites', 'learningOutcomes', 'tags'];
    
    fieldsToParseAsJSON.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        try {
          req.body[field] = JSON.parse(req.body[field]);
        } catch (error) {
          // Keep as string, validation will handle it
        }
      }
    });

    // Convert numeric fields
    if (req.body.price) req.body.price = parseFloat(req.body.price);
    if (req.body.originalPrice) req.body.originalPrice = parseFloat(req.body.originalPrice);
    if (req.body.maxStudents) req.body.maxStudents = parseInt(req.body.maxStudents);

    // Check for uploaded image file
    if (!req.files || !req.files.image || req.files.image.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Validation error",
        errors: [
          {
            field: "image",
            message: "Course image is required"
          }
        ]
      });
    }

    // Add the uploaded file info to req.body for validation (if needed)
    req.body.image = req.files.image[0];

    // Validate the request body (excluding image field since it's handled above)
    const { error } = createCourseMultipartSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        status: "error",
        message: "Validation error",
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    next();
  } catch (error) {
    return res.status(400).json({
      status: "error",
      message: "Invalid request data",
      error: error.message
    });
  }
};
