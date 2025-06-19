import Course from "../models/course.js";
import Module from "../models/module.js";
import Lesson from "../models/lesson.js";
import UserCourseProgress from "../models/userCourseProgress.js";
import User from "../../user/models/user.js";

class CourseService {
  // Admin/Tutor methods
  async createCourse(courseData, instructorId) {
    try {
      const instructor = await User.findById(instructorId);
      if (!instructor || !["admin", "tutor", "super admin"].includes(instructor.role)) {
        throw new Error("Only admins and tutors can create courses");
      }

      const course = new Course({
        ...courseData,
        instructor: instructorId,
      });

      await course.save();
      await course.populate('instructor', 'firstName lastName email');
      
      return course;
    } catch (error) {
      throw error;
    }
  }

  async updateCourse(courseId, updateData, userId) {
    try {
      const course = await Course.findById(courseId);
      if (!course) {
        throw new Error("Course not found");
      }

      const user = await User.findById(userId);
      if (!user || !["admin", "super admin"].includes(user.role)) {
        if (course.instructor.toString() !== userId) {
          throw new Error("You can only update your own courses");
        }
      }

      const updatedCourse = await Course.findByIdAndUpdate(
        courseId,
        updateData,
        { new: true, runValidators: true }
      ).populate('instructor', 'firstName lastName email');

      return updatedCourse;
    } catch (error) {
      throw error;
    }
  }

  async deleteCourse(courseId, userId) {
    try {
      const course = await Course.findById(courseId);
      if (!course) {
        throw new Error("Course not found");
      }

      const user = await User.findById(userId);
      if (!user || !["admin", "super admin"].includes(user.role)) {
        if (course.instructor.toString() !== userId) {
          throw new Error("You can only delete your own courses");
        }
      }

      // Check if course has enrolled students
      const enrolledStudents = await UserCourseProgress.countDocuments({ courseId });
      if (enrolledStudents > 0) {
        throw new Error("Cannot delete course with enrolled students");
      }

      await Course.findByIdAndDelete(courseId);
      return { message: "Course deleted successfully" };
    } catch (error) {
      throw error;
    }
  }

  async addModuleToCourse(moduleData, userId) {
    try {
      const course = await Course.findById(moduleData.courseId);
      if (!course) {
        throw new Error("Course not found");
      }

      const user = await User.findById(userId);
      if (!user || !["admin", "super admin"].includes(user.role)) {
        if (course.instructor.toString() !== userId) {
          throw new Error("You can only add modules to your own courses");
        }
      }

      const module = new Module(moduleData);
      await module.save();

      // Add module to course
      course.modules.push(module._id);
      await course.save();

      return module;
    } catch (error) {
      throw error;
    }
  }

  async addLessonToModule(lessonData, userId) {
    try {
      const module = await Module.findById(lessonData.moduleId);
      if (!module) {
        throw new Error("Module not found");
      }

      const course = await Course.findById(lessonData.courseId);
      if (!course) {
        throw new Error("Course not found");
      }

      const user = await User.findById(userId);
      if (!user || !["admin", "super admin"].includes(user.role)) {
        if (course.instructor.toString() !== userId) {
          throw new Error("You can only add lessons to your own courses");
        }
      }

      const lesson = new Lesson(lessonData);
      await lesson.save();

      // Add lesson to module
      module.lessons.push(lesson._id);
      await module.save();

      return lesson;
    } catch (error) {
      throw error;
    }
  }

  // User methods
  async getAllCourses(filters = {}, page = 1, limit = 10) {
    try {
      const query = { status: "published", isActive: true };

      // Apply filters
      if (filters.category) query.category = filters.category;
      if (filters.level) query.level = filters.level;
      if (filters.featured) query.featured = filters.featured;
      if (filters.search) {
        query.$text = { $search: filters.search };
      }

      const skip = (page - 1) * limit;

      const courses = await Course.find(query)
        .populate('instructor', 'firstName lastName')
        .select('-modules') // Don't include full modules data in list
        .sort({ featured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Course.countDocuments(query);

      return {
        courses,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: total,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getCourseById(courseId) {
    try {
      const course = await Course.findById(courseId)
        .populate('instructor', 'firstName lastName email')
        .populate({
          path: 'modules',
          populate: {
            path: 'lessons',
            select: 'title description type isFree order',
          },
        });

      if (!course) {
        throw new Error("Course not found");
      }

      return course;
    } catch (error) {
      throw error;
    }
  }

  async enrollUserInCourse(userId, courseId) {
    try {
      const course = await Course.findById(courseId);
      if (!course) {
        throw new Error("Course not found");
      }

      if (course.status !== "published") {
        throw new Error("Course is not available for enrollment");
      }

      // Check if user is already enrolled
      const existingEnrollment = await UserCourseProgress.findOne({
        userId,
        courseId,
      });

      if (existingEnrollment) {
        throw new Error("You are already enrolled in this course");
      }

      // Check max students limit
      if (course.maxStudents) {
        const enrolledCount = await UserCourseProgress.countDocuments({ courseId });
        if (enrolledCount >= course.maxStudents) {
          throw new Error("Course is full");
        }
      }

      // Get total lessons count
      const totalLessons = await Lesson.countDocuments({ courseId });

      const enrollment = new UserCourseProgress({
        userId,
        courseId,
        progress: {
          totalLessons,
        },
      });

      await enrollment.save();

      // Update course total students count
      course.totalStudents += 1;
      await course.save();

      return enrollment;
    } catch (error) {
      throw error;
    }
  }

  async getUserCourseProgress(userId, courseId) {
    try {
      const progress = await UserCourseProgress.findOne({ userId, courseId })
        .populate('courseId', 'title description')
        .populate('progress.completedLessons.lessonId', 'title type');

      if (!progress) {
        throw new Error("You are not enrolled in this course");
      }

      return progress;
    } catch (error) {
      throw error;
    }
  }

  async markLessonComplete(userId, lessonId, timeSpent = 0) {
    try {
      const lesson = await Lesson.findById(lessonId);
      if (!lesson) {
        throw new Error("Lesson not found");
      }

      const progress = await UserCourseProgress.findOne({
        userId,
        courseId: lesson.courseId,
      });

      if (!progress) {
        throw new Error("You are not enrolled in this course");
      }

      // Check if lesson is already completed
      const alreadyCompleted = progress.progress.completedLessons.some(
        (completed) => completed.lessonId.toString() === lessonId
      );

      if (alreadyCompleted) {
        throw new Error("Lesson already completed");
      }

      // Add to completed lessons
      progress.progress.completedLessons.push({
        lessonId,
        timeSpent,
      });

      progress.progress.completedLessonsCount += 1;
      progress.timeSpent.total += timeSpent;
      progress.lastAccessedAt = new Date();

      // Check if course is completed
      if (progress.progress.completedLessonsCount >= progress.progress.totalLessons) {
        progress.status = "completed";
        progress.completionDate = new Date();
      } else {
        progress.status = "in-progress";
      }

      await progress.save();

      return progress;
    } catch (error) {
      throw error;
    }
  }

  async getUserDashboard(userId) {
    try {
      const enrolledCourses = await UserCourseProgress.find({ userId })
        .populate('courseId', 'title thumbnail category level')
        .sort({ lastAccessedAt: -1 });

      const stats = {
        totalCourses: enrolledCourses.length,
        completedCourses: enrolledCourses.filter(p => p.status === "completed").length,
        inProgressCourses: enrolledCourses.filter(p => p.status === "in-progress").length,
        overallProgress: 0,
      };

      if (stats.totalCourses > 0) {
        const totalProgress = enrolledCourses.reduce(
          (sum, course) => sum + course.progress.progressPercentage,
          0
        );
        stats.overallProgress = Math.round(totalProgress / stats.totalCourses);
      }

      return {
        stats,
        recentCourses: enrolledCourses.slice(0, 5),
        enrolledCourses,
      };
    } catch (error) {
      throw error;
    }
  }
}

export default new CourseService();
