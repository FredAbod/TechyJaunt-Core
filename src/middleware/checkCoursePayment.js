import Course from "../../resources/courses/models/course.js";
import PaymentService from "../../resources/payments/services/payment.service.js";

/**
 * Middleware to check if a user has paid for a course before accessing it
 */
export const checkCoursePayment = async (req, res, next) => {
  try {
    const courseId = req.params.courseId || req.body.courseId;
    const userId = req.user._id;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        status: "error",
        message: "Course not found",
      });
    }

    // Free courses don't need payment verification
    if (course.price === 0) {
      return next();
    }

    // Check if user has paid for the course
    const hasPaid = await PaymentService.getCoursePaymentStatus(userId, courseId);
    if (!hasPaid) {
      return res.status(403).json({
        status: "error",
        message: "Please purchase this course to access its content",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
