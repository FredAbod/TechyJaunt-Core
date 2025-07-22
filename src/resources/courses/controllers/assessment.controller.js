import assessmentService from "../services/assessment.service.js";
import { successResMsg, errorResMsg } from "../../../utils/lib/response.js";
import logger from "../../../utils/log/logger.js";

// Helper function to maintain backward compatibility
const sendResponse = (res, statusCode, data) => {
  if (statusCode >= 400) {
    return errorResMsg(res, statusCode, data.message || "An error occurred");
  }
  return successResMsg(res, statusCode, data);
};

class AssessmentController {

  // Create assessment (Admin/Tutor only)
  async createAssessment(req, res) {
    try {
      const { moduleId, courseId, title, description, questions, passingScore, timeLimit, attemptsAllowed } = req.body;
      const createdBy = req.user.id;

      logger.info(`Creating assessment for module ${moduleId} by user ${createdBy}`);

      const assessment = await assessmentService.createAssessment(
        { moduleId, courseId, title, description, questions, passingScore, timeLimit, attemptsAllowed },
        createdBy
      );

      logger.info(`Assessment created successfully with ID: ${assessment._id}`);

      return sendResponse(res, 201, {
        message: "Assessment created successfully",
        assessment
      });
    } catch (error) {
      logger.error("Error creating assessment:", error);
      return sendResponse(res, error.statusCode || 500, {
        message: error.message || "Failed to create assessment"
      });
    }
  }

  // Get assessment by module ID (Student view)
  async getAssessmentByModule(req, res) {
    try {
      const { moduleId } = req.params;
      const userId = req.user.id;

      logger.info(`Fetching assessment for module ${moduleId} for user ${userId}`);

      const assessment = await assessmentService.getAssessmentByModule(moduleId, userId);

      return sendResponse(res, 200, {
        message: "Assessment fetched successfully",
        assessment
      });
    } catch (error) {
      logger.error("Error fetching assessment:", error);
      return sendResponse(res, error.statusCode || 500, {
        message: error.message || "Failed to fetch assessment"
      });
    }
  }

  // Submit assessment attempt
  async submitAssessment(req, res) {
    try {
      const { assessmentId } = req.params;
      const { answers } = req.body;
      const userId = req.user.id;

      logger.info(`User ${userId} submitting assessment ${assessmentId}`);

      if (!answers || !Array.isArray(answers)) {
        return sendResponse(res, 400, {
          message: "Answers are required and must be an array"
        });
      }

      const result = await assessmentService.submitAssessment(assessmentId, userId, answers);

      logger.info(`Assessment submitted successfully. Score: ${result.score}, Passed: ${result.passed}`);

      return sendResponse(res, 200, {
        message: result.passed ? "Assessment passed successfully!" : "Assessment completed. You can retake if attempts are remaining.",
        result
      });
    } catch (error) {
      logger.error("Error submitting assessment:", error);
      return sendResponse(res, error.statusCode || 500, {
        message: error.message || "Failed to submit assessment"
      });
    }
  }

  // Get assessment attempts for a user
  async getAssessmentAttempts(req, res) {
    try {
      const { assessmentId } = req.params;
      const userId = req.user.id;

      logger.info(`Fetching assessment attempts for assessment ${assessmentId} for user ${userId}`);

      const attempts = await assessmentService.getAssessmentAttempts(assessmentId, userId);

      return sendResponse(res, 200, {
        message: "Assessment attempts fetched successfully",
        attempts
      });
    } catch (error) {
      logger.error("Error fetching assessment attempts:", error);
      return sendResponse(res, error.statusCode || 500, {
        message: error.message || "Failed to fetch assessment attempts"
      });
    }
  }

  // Update assessment (Admin/Tutor only)
  async updateAssessment(req, res) {
    try {
      const { assessmentId } = req.params;
      const updateData = req.body;
      const updatedBy = req.user.id;

      logger.info(`Updating assessment ${assessmentId} by user ${updatedBy}`);

      const assessment = await assessmentService.updateAssessment(assessmentId, updateData, updatedBy);

      logger.info(`Assessment updated successfully`);

      return sendResponse(res, 200, {
        message: "Assessment updated successfully",
        assessment
      });
    } catch (error) {
      logger.error("Error updating assessment:", error);
      return sendResponse(res, error.statusCode || 500, {
        message: error.message || "Failed to update assessment"
      });
    }
  }

  // Delete assessment (Admin/Tutor only)
  async deleteAssessment(req, res) {
    try {
      const { assessmentId } = req.params;
      const deletedBy = req.user.id;

      logger.info(`Deleting assessment ${assessmentId} by user ${deletedBy}`);

      const result = await assessmentService.deleteAssessment(assessmentId);

      logger.info(`Assessment deleted successfully`);

      return sendResponse(res, 200, result);
    } catch (error) {
      logger.error("Error deleting assessment:", error);
      return sendResponse(res, error.statusCode || 500, {
        message: error.message || "Failed to delete assessment"
      });
    }
  }

  // Get all assessments for a course (Admin/Tutor only)
  async getCourseAssessments(req, res) {
    try {
      const { courseId } = req.params;

      logger.info(`Fetching all assessments for course ${courseId}`);

      const assessments = await assessmentService.getCourseAssessments(courseId);

      return sendResponse(res, 200, {
        message: "Course assessments fetched successfully",
        assessments,
        total: assessments.length
      });
    } catch (error) {
      logger.error("Error fetching course assessments:", error);
      return sendResponse(res, error.statusCode || 500, {
        message: error.message || "Failed to fetch course assessments"
      });
    }
  }

  // Get assessment details for instructor/admin (includes correct answers)
  async getAssessmentDetails(req, res) {
    try {
      const { assessmentId } = req.params;

      logger.info(`Fetching assessment details for assessment ${assessmentId}`);

      // Import Assessment model to get full details
      const Assessment = (await import("../models/assessment.js")).default;
      const assessment = await Assessment.findById(assessmentId)
        .populate('moduleId', 'title order')
        .populate('courseId', 'title')
        .populate('createdBy', 'firstName lastName email');

      if (!assessment) {
        return sendResponse(res, 404, {
          message: "Assessment not found"
        });
      }

      return sendResponse(res, 200, {
        message: "Assessment details fetched successfully",
        assessment
      });
    } catch (error) {
      logger.error("Error fetching assessment details:", error);
      return sendResponse(res, error.statusCode || 500, {
        message: error.message || "Failed to fetch assessment details"
      });
    }
  }
}

export default new AssessmentController();
