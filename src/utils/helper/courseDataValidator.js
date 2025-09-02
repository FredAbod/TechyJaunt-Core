import Lesson from "../../resources/courses/models/lesson.js";
import logger from "../log/logger.js";

/**
 * Validates and cleans course data to ensure no non-existent lessons are returned
 */
class CourseDataValidator {
  
  /**
   * Validates lessons in course modules and filters out non-existent ones
   * @param {Object} course - Course object with populated modules
   * @param {string} courseId - Course ID for logging
   * @returns {Object} - Cleaned course object
   */
  static async validateAndCleanCourse(course, courseId = null) {
    if (!course || !course.modules) {
      return course;
    }

    try {
      // Get all valid lesson IDs for this course
      const validLessons = await Lesson.find({ 
        courseId: courseId || course._id, 
        isActive: true 
      }).select('_id').lean();
      
      const validLessonIds = new Set(validLessons.map(l => l._id.toString()));

      // Clean modules
      course.modules = course.modules.map(module => {
        if (module.lessons && Array.isArray(module.lessons)) {
          const originalCount = module.lessons.length;
          
          // Filter out lessons that don't exist in DB
          module.lessons = module.lessons.filter(lesson => {
            if (!lesson || !lesson._id) return false;
            
            const lessonId = lesson._id.toString();
            const isValid = validLessonIds.has(lessonId);
            
            if (!isValid) {
              logger.warn(`Filtered out non-existent lesson ${lessonId} from course ${courseId || course._id}, module ${module._id}`);
            }
            
            return isValid;
          });

          const filteredCount = module.lessons.length;
          if (originalCount !== filteredCount) {
            logger.info(`Module ${module._id}: filtered ${originalCount - filteredCount} non-existent lessons`);
          }
        }
        return module;
      });

      return course;
    } catch (error) {
      logger.error(`Error validating course data: ${error.message}`);
      return course; // Return original course if validation fails
    }
  }

  /**
   * Validates lessons array and filters out non-existent ones
   * @param {Array} lessons - Array of lesson objects
   * @param {string} courseId - Course ID for validation
   * @returns {Array} - Cleaned lessons array
   */
  static async validateLessons(lessons, courseId) {
    if (!Array.isArray(lessons) || lessons.length === 0) {
      return lessons;
    }

    try {
      // Get all valid lesson IDs for this course
      const validLessons = await Lesson.find({ 
        courseId, 
        isActive: true 
      }).select('_id').lean();
      
      const validLessonIds = new Set(validLessons.map(l => l._id.toString()));

      const originalCount = lessons.length;
      const validLessonArray = lessons.filter(lesson => {
        if (!lesson || !lesson._id) return false;
        
        const lessonId = lesson._id.toString();
        const isValid = validLessonIds.has(lessonId);
        
        if (!isValid) {
          logger.warn(`Filtered out non-existent lesson ${lessonId} from course ${courseId}`);
        }
        
        return isValid;
      });

      const filteredCount = validLessonArray.length;
      if (originalCount !== filteredCount) {
        logger.info(`Course ${courseId}: filtered ${originalCount - filteredCount} non-existent lessons`);
      }

      return validLessonArray;
    } catch (error) {
      logger.error(`Error validating lessons: ${error.message}`);
      return lessons; // Return original lessons if validation fails
    }
  }

  /**
   * Check if a lesson exists in the database
   * @param {string} lessonId - Lesson ID to check
   * @param {string} courseId - Course ID for additional validation
   * @returns {boolean} - True if lesson exists and is active
   */
  static async lessonExists(lessonId, courseId = null) {
    try {
      const query = { _id: lessonId, isActive: true };
      if (courseId) {
        query.courseId = courseId;
      }
      
      const lesson = await Lesson.findOne(query).select('_id').lean();
      return !!lesson;
    } catch (error) {
      logger.error(`Error checking lesson existence: ${error.message}`);
      return false;
    }
  }
}

export default CourseDataValidator;
