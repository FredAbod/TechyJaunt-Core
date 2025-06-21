import CourseService from "../services/course.service.js";
import { successResMsg, errorResMsg } from "../../../utils/lib/response.js";
import logger from "../../../utils/log/logger.js";

// Admin/Tutor Controllers
export const createCourse = async (req, res) => {
  try {
    const courseData = req.body;
    const instructorId = req.user.userId;

    const course = await CourseService.createCourse(courseData, instructorId);

    logger.info(`Course created: ${course.title} by ${instructorId}`);
    return successResMsg(res, 201, { message: "Course created successfully", course });

  } catch (error) {
    logger.error(`Create course error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

export const updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const updateData = req.body;
    const userId = req.user.userId;

    const course = await CourseService.updateCourse(courseId, updateData, userId);

    logger.info(`Course updated: ${courseId} by ${userId}`);
    return successResMsg(res, 200, { message: "Course updated successfully", course });

  } catch (error) {
    logger.error(`Update course error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    const result = await CourseService.deleteCourse(courseId, userId);

    logger.info(`Course deleted: ${courseId} by ${userId}`);
    return successResMsg(res, 200, { message: result.message });

  } catch (error) {
    logger.error(`Delete course error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

export const addCurriculum = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { modules } = req.body;
    const userId = req.user.userId;

    const results = [];

    for (const moduleData of modules) {
      // Extract lessons from moduleData before creating module
      const { lessons, ...moduleInfo } = moduleData;
      
      moduleInfo.courseId = courseId;
      const module = await CourseService.addModuleToCourse(moduleInfo, userId);
      
      // Add lessons to the module if provided
      if (lessons && lessons.length > 0) {
        const moduleLessons = [];
        for (const lessonData of lessons) {
          lessonData.moduleId = module._id;
          lessonData.courseId = courseId;
          const lesson = await CourseService.addLessonToModule(lessonData, userId);
          moduleLessons.push(lesson);
        }
        module.lessons = moduleLessons;
      }
      
      results.push(module);
    }

    logger.info(`Curriculum added to course: ${courseId} by ${userId}`);
    return successResMsg(res, 201, { message: "Curriculum added successfully", modules: results });

  } catch (error) {
    logger.error(`Add curriculum error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

export const addModule = async (req, res) => {
  try {
    const moduleData = req.body;
    const userId = req.user.userId;

    const module = await CourseService.addModuleToCourse(moduleData, userId);

    logger.info(`Module added: ${module.title} by ${userId}`);
    return successResMsg(res, 201, { message: "Module added successfully", module });

  } catch (error) {
    logger.error(`Add module error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

export const addLesson = async (req, res) => {
  try {
    const lessonData = req.body;
    const userId = req.user.userId;

    const lesson = await CourseService.addLessonToModule(lessonData, userId);

    logger.info(`Lesson added: ${lesson.title} by ${userId}`);
    return successResMsg(res, 201, { message: "Lesson added successfully", lesson });

  } catch (error) {
    logger.error(`Add lesson error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

// User Controllers
export const getAllCourses = async (req, res) => {
  try {
    const { 
      category, 
      level, 
      featured, 
      search, 
      page = 1, 
      limit = 10 
    } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (level) filters.level = level;
    if (featured) filters.featured = featured === 'true';
    if (search) filters.search = search;

    const result = await CourseService.getAllCourses(
      filters, 
      parseInt(page), 
      parseInt(limit)
    );

    return successResMsg(res, 200, { 
      message: "Courses retrieved successfully", 
      ...result 
    });

  } catch (error) {
    logger.error(`Get courses error: ${error.message}`);
    return errorResMsg(res, 500, "Failed to retrieve courses");
  }
};

export const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await CourseService.getCourseById(courseId);

    return successResMsg(res, 200, { message: "Course retrieved successfully", course });

  } catch (error) {
    logger.error(`Get course error: ${error.message}`);
    return errorResMsg(res, 404, error.message);
  }
};

export const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user.userId;

    const enrollment = await CourseService.enrollUserInCourse(userId, courseId);

    logger.info(`User enrolled: ${userId} in course ${courseId}`);
    return successResMsg(res, 201, { message: "Successfully enrolled in course", enrollment });

  } catch (error) {
    logger.error(`Enrollment error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    const progress = await CourseService.getUserCourseProgress(userId, courseId);

    return successResMsg(res, 200, { message: "Course progress retrieved successfully", progress });

  } catch (error) {
    logger.error(`Get progress error: ${error.message}`);
    return errorResMsg(res, 404, error.message);
  }
};

export const markLessonComplete = async (req, res) => {
  try {
    const { lessonId, timeSpent } = req.body;
    const userId = req.user.userId;

    const progress = await CourseService.markLessonComplete(userId, lessonId, timeSpent);

    logger.info(`Lesson completed: ${lessonId} by user ${userId}`);
    return successResMsg(res, 200, { message: "Lesson marked as complete", progress });

  } catch (error) {
    logger.error(`Complete lesson error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

export const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    const dashboardData = await CourseService.getUserDashboard(userId);

    return successResMsg(res, 200, { 
      message: "Dashboard data retrieved successfully", 
      ...dashboardData 
    });

  } catch (error) {
    logger.error(`Get dashboard error: ${error.message}`);
    return errorResMsg(res, 500, "Failed to retrieve dashboard data");
  }
};

// Admin Controllers
export const getAllCoursesAdmin = async (req, res) => {
  try {
    const { 
      category, 
      level, 
      featured, 
      status,
      search, 
      page = 1, 
      limit = 10 
    } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (level) filters.level = level;
    if (featured) filters.featured = featured === 'true';
    if (status) filters.status = status;
    if (search) filters.search = search;

    const result = await CourseService.getAllCoursesAdmin(
      filters, 
      parseInt(page), 
      parseInt(limit)
    );

    return successResMsg(res, 200, { 
      message: "Courses retrieved successfully (Admin)", 
      ...result 
    });

  } catch (error) {
    logger.error(`Get courses admin error: ${error.message}`);
    return errorResMsg(res, 500, "Failed to retrieve courses");
  }
};

export const publishCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    const course = await CourseService.updateCourse(courseId, { status: "published" }, userId);

    logger.info(`Course published: ${courseId} by ${userId}`);
    return successResMsg(res, 200, { message: "Course published successfully", course });

  } catch (error) {
    logger.error(`Publish course error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};
