import progressService from "../services/progress.service.js";
import { successResMsg, errorResMsg } from "../../../utils/lib/response.js";
import logger from "../../../utils/log/logger.js";

// Helper function to maintain backward compatibility
const sendResponse = (res, statusCode, data) => {
  if (statusCode >= 400) {
    return errorResMsg(res, statusCode, data.message || "An error occurred");
  }
  return successResMsg(res, statusCode, data);
};

class ProgressController {

  // Update video watch progress
  async updateVideoProgress(req, res) {
    const startTime = Date.now();
    try {
      const { courseId, lessonId } = req.params;
      const { watchTime, totalDuration } = req.body;
      const userId = req.user.userId;

      logger.info(`[UPDATE_VIDEO_PROGRESS] Starting request`, {
        userId,
        courseId,
        lessonId,
        watchTime,
        totalDuration,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      // Validate ObjectId format for params
      if (!/^[0-9a-fA-F]{24}$/.test(courseId)) {
        logger.warn(`[UPDATE_VIDEO_PROGRESS] Invalid courseId format`, { 
          userId, 
          courseId, 
          format: 'ObjectId validation failed' 
        });
        return sendResponse(res, 400, { message: "Invalid courseId parameter" });
      }

      if (!/^[0-9a-fA-F]{24}$/.test(lessonId)) {
        logger.warn(`[UPDATE_VIDEO_PROGRESS] Invalid lessonId format`, { 
          userId, 
          lessonId, 
          format: 'ObjectId validation failed' 
        });
        return sendResponse(res, 400, { message: "Invalid lessonId parameter" });
      }

      logger.info(`[UPDATE_VIDEO_PROGRESS] ObjectId validation passed`, { userId, courseId, lessonId });

      // Validate required fields
      if (!watchTime || !totalDuration) {
        logger.warn(`[UPDATE_VIDEO_PROGRESS] Missing required fields`, {
          userId,
          courseId,
          lessonId,
          hasWatchTime: !!watchTime,
          hasTotalDuration: !!totalDuration
        });
        return sendResponse(res, 400, {
          message: "Watch time and total duration are required"
        });
      }

      // Validate value ranges
      if (watchTime < 0 || totalDuration <= 0 || watchTime > totalDuration) {
        logger.warn(`[UPDATE_VIDEO_PROGRESS] Invalid time values`, {
          userId,
          courseId,
          lessonId,
          watchTime,
          totalDuration,
          watchTimeValid: watchTime >= 0,
          totalDurationValid: totalDuration > 0,
          watchTimeWithinRange: watchTime <= totalDuration
        });
        return sendResponse(res, 400, {
          message: "Invalid watch time or duration values"
        });
      }

      logger.info(`[UPDATE_VIDEO_PROGRESS] Input validation completed successfully`, {
        userId,
        courseId,
        lessonId,
        watchTime,
        totalDuration
      });

      logger.info(`[UPDATE_VIDEO_PROGRESS] Calling service method`, { userId, courseId, lessonId });

      const result = await progressService.updateVideoProgress(
        userId, 
        courseId, 
        lessonId, 
        watchTime, 
        totalDuration
      );

      const processingTime = Date.now() - startTime;
      logger.info(`[UPDATE_VIDEO_PROGRESS] Service method completed successfully`, {
        userId,
        courseId,
        lessonId,
        processingTimeMs: processingTime,
        resultType: typeof result,
        hasResult: !!result
      });

      return sendResponse(res, 200, {
        message: "Video progress updated successfully",
        progress: result
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`[UPDATE_VIDEO_PROGRESS] Error occurred`, {
        userId: req.user?.userId,
        courseId: req.params?.courseId,
        lessonId: req.params?.lessonId,
        error: error.message,
        stack: error.stack,
        statusCode: error.statusCode,
        processingTimeMs: processingTime,
        errorType: error.constructor.name
      });
      
      return sendResponse(res, error.statusCode || 500, {
        message: error.message || "Failed to update video progress"
      });
    }
  }

  // Get user's progress for a course
  async getUserProgress(req, res) {
    try {
      const { courseId } = req.params;
      const userId = req.user.userId;

      logger.info(`Fetching progress for user ${userId}, course ${courseId}`);

      const progress = await progressService.getUserProgress(userId, courseId);

      return sendResponse(res, 200, {
        message: "User progress fetched successfully",
        progress
      });
    } catch (error) {
      logger.error("Error fetching user progress:", error);
      return sendResponse(res, error.statusCode || 500, {
        message: error.message || "Failed to fetch user progress"
      });
    }
  }

  // Get progress statistics for admin/tutor
  async getCourseProgressStats(req, res) {
    try {
      const { courseId } = req.params;

      logger.info(`Fetching progress statistics for course ${courseId}`);

      const stats = await progressService.getCourseProgressStats(courseId);

      return sendResponse(res, 200, {
        message: "Course progress statistics fetched successfully",
        stats
      });
    } catch (error) {
      logger.error("Error fetching course progress statistics:", error);
      return sendResponse(res, error.statusCode || 500, {
        message: error.message || "Failed to fetch course progress statistics"
      });
    }
  }

  // Reset user progress (Admin only)
  async resetUserProgress(req, res) {
    try {
      const { courseId, userId } = req.params;

      logger.info(`Resetting progress for user ${userId}, course ${courseId}`);

      const result = await progressService.resetUserProgress(userId, courseId);

      logger.info(`User progress reset successfully`);

      return sendResponse(res, 200, result);
    } catch (error) {
      logger.error("Error resetting user progress:", error);
      return sendResponse(res, error.statusCode || 500, {
        message: error.message || "Failed to reset user progress"
      });
    }
  }

  // Get module access status
  async getModuleAccess(req, res) {
    try {
      const { courseId, moduleId } = req.params;
      const userId = req.user.userId;

      logger.info(`Checking module access for user ${userId}, course ${courseId}, module ${moduleId}`);

      const access = await progressService.getModuleAccess(userId, courseId, moduleId);

      return sendResponse(res, 200, {
        message: "Module access status fetched successfully",
        access
      });
    } catch (error) {
      logger.error("Error checking module access:", error);
      return sendResponse(res, error.statusCode || 500, {
        message: error.message || "Failed to check module access"
      });
    }
  }

  // Initialize progress for a user (usually called after subscription)
  async initializeProgress(req, res) {
    try {
      const { courseId } = req.params;
      const { subscriptionId } = req.body;
      const userId = req.user.userId;

      if (!subscriptionId) {
        return sendResponse(res, 400, {
          message: "Subscription ID is required"
        });
      }

      logger.info(`Initializing progress for user ${userId}, course ${courseId}, subscription ${subscriptionId}`);

      const progress = await progressService.initializeProgress(userId, courseId, subscriptionId);

      logger.info(`Progress initialized successfully`);

      return sendResponse(res, 201, {
        message: "Progress initialized successfully",
        progress
      });
    } catch (error) {
      logger.error("Error initializing progress:", error);
      return sendResponse(res, error.statusCode || 500, {
        message: error.message || "Failed to initialize progress"
      });
    }
  }

  // Get dashboard data (user's active courses and progress)
  async getDashboard(req, res) {
    try {
      const userId = req.user.userId;

      logger.info(`Fetching dashboard data for user ${userId}`);

      // Import Progress model to get user's active progresses
      const Progress = (await import("../models/progress.js")).default;
      const progresses = await Progress.find({ userId })
        .populate('courseId', 'title description thumbnail category level')
        .populate('subscriptionId', 'status endDate plan')
        .sort({ lastActivityAt: -1 });

      const activeProgresses = progresses.filter(progress => 
        progress.subscriptionId && 
        progress.subscriptionId.status === 'active' &&
        progress.subscriptionId.endDate > new Date()
      );

      const dashboardData = activeProgresses.map(progress => ({
        courseId: progress.courseId._id,
        courseTitle: progress.courseId.title,
        courseDescription: progress.courseId.description,
        courseThumbnail: progress.courseId.thumbnail,
        courseCategory: progress.courseId.category,
        courseLevel: progress.courseId.level,
        overallProgress: progress.overallProgress,
        currentModuleIndex: progress.currentModuleIndex,
        totalModules: progress.modules.length,
        isCompleted: progress.isCompleted,
        completedAt: progress.completedAt,
        lastActivityAt: progress.lastActivityAt,
        subscriptionPlan: progress.subscriptionId.plan,
        subscriptionEndDate: progress.subscriptionId.endDate
      }));

      return sendResponse(res, 200, {
        message: "Dashboard data fetched successfully",
        courses: dashboardData,
        totalActiveCourses: dashboardData.length
      });
    } catch (error) {
      logger.error("Error fetching dashboard data:", error);
      return sendResponse(res, error.statusCode || 500, {
        message: error.message || "Failed to fetch dashboard data"
      });
    }
  }

  // Add missing lessons to user progress
  async addMissingLessons(req, res) {
    try {
      const { courseId } = req.params;
      const { moduleId } = req.body; // Optional: specific module
      const userId = req.user.userId;

      logger.info(`Adding missing lessons for user ${userId}, course ${courseId}${moduleId ? `, module ${moduleId}` : ''}`);

      const result = await progressService.addMissingLessonsToProgress(userId, courseId, moduleId);

      return sendResponse(res, 200, {
        message: result.message,
        lessonsAdded: result.lessonsAdded
      });
    } catch (error) {
      logger.error("Error adding missing lessons:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.userId,
        courseId: req.params?.courseId,
        moduleId: req.body?.moduleId
      });
      return sendResponse(res, error.statusCode || 500, {
        message: error.message || "Failed to add missing lessons"
      });
    }
  }

  // Sync user progress with current course structure
  async syncProgress(req, res) {
    try {
      const { courseId } = req.params;
      const userId = req.user.userId;

      logger.info(`Syncing progress for user ${userId}, course ${courseId}`);

      const result = await progressService.syncUserProgressWithCourse(userId, courseId);

      return sendResponse(res, 200, {
        message: result.message,
        lessonsAdded: result.lessonsAdded
      });
    } catch (error) {
      logger.error("Error syncing progress:", error);
      return sendResponse(res, error.statusCode || 500, {
        message: error.message || "Failed to sync progress"
      });
    }
  }

  // Debug endpoint to list all lessons for a course
  async getCourseLessons(req, res) {
    try {
      const { courseId } = req.params;

      logger.info(`Fetching all lessons for course ${courseId}`);

      // Import models
      const Module = (await import("../models/module.js")).default;
      const Lesson = (await import("../models/lesson.js")).default;
      const PrerecordedClass = (await import("../models/prerecordedClass.js")).default;

      // Get all modules for the course
      const modules = await Module.find({ courseId, isActive: true }).sort({ order: 1 });
      
      const courseData = {
        courseId,
        totalModules: modules.length,
        modules: []
      };

      for (const module of modules) {
        // Check both Lesson and PrerecordedClass collections
        const lessons = await Lesson.find({ 
          moduleId: module._id,
          isActive: true 
        }).select('_id title description duration content order');

        const legacyLessons = await PrerecordedClass.find({ 
          moduleId: module._id,
          isActive: true 
        }).select('_id title description duration order');

        courseData.modules.push({
          moduleId: module._id,
          moduleTitle: module.title,
          moduleOrder: module.order,
          newLessons: {
            total: lessons.length,
            lessons: lessons.map(lesson => ({
              lessonId: lesson._id,
              title: lesson.title,
              description: lesson.description,
              duration: lesson.content?.videoDuration || lesson.duration,
              order: lesson.order,
              type: lesson.type || 'video'
            }))
          },
          legacyLessons: {
            total: legacyLessons.length,
            lessons: legacyLessons.map(lesson => ({
              lessonId: lesson._id,
              title: lesson.title,
              description: lesson.description,
              duration: lesson.duration,
              order: lesson.order
            }))
          }
        });
      }

      return sendResponse(res, 200, {
        message: "Course lessons fetched successfully (showing both Lesson and PrerecordedClass collections)",
        data: courseData
      });
    } catch (error) {
      logger.error("Error fetching course lessons:", error);
      return sendResponse(res, error.statusCode || 500, {
        message: error.message || "Failed to fetch course lessons"
      });
    }
  }
}

export default new ProgressController();
