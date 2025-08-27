// ...existing code...
import Course from "../models/course.js";
import Module from "../models/module.js";
import Lesson from "../models/lesson.js";
import UserCourseProgress from "../models/userCourseProgress.js";
import User from "../../user/models/user.js";
import PaymentService from "../../payments/services/payment.service.js";
import { getVideoDurationFromUrl } from "../../../utils/image/cloudinary.js";

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

      // Check if order already exists and auto-adjust if needed
      if (moduleData.order) {
        const existingModule = await Module.findOne({ 
          courseId: moduleData.courseId, 
          order: moduleData.order 
        });
        
        if (existingModule) {
          // Find the next available order number
          const highestOrder = await Module.findOne({ 
            courseId: moduleData.courseId 
          }).sort({ order: -1 });
          
          moduleData.order = highestOrder ? highestOrder.order + 1 : 1;
        }
      } else {
        // If no order specified, set to next available
        const highestOrder = await Module.findOne({ 
          courseId: moduleData.courseId 
        }).sort({ order: -1 });
        
        moduleData.order = highestOrder ? highestOrder.order + 1 : 1;
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

  async updateModule(moduleId, updateData, userId) {
    try {
      const module = await Module.findById(moduleId).populate('courseId');
      if (!module) throw new Error('Module not found');

      const course = module.courseId;
      const user = await User.findById(userId);
      if (!user || !['admin', 'super admin'].includes(user.role)) {
        if (course.instructor.toString() !== userId) {
          throw new Error('You can only update modules in your own courses');
        }
      }

      // If order is changed, adjust other modules ordering
      if (updateData.order && updateData.order !== module.order) {
        // clamp to positive
        const newOrder = Math.max(1, parseInt(updateData.order, 10) || module.order);
        // shift other modules accordingly
        const modules = await Module.find({ courseId: course._id }).sort({ order: 1 });
        // remove current module from list
        const others = modules.filter(m => m._id.toString() !== moduleId);
        // insert module placeholder at new position
        others.splice(Math.max(0, newOrder - 1), 0, module);
        // reassign orders
        for (let i = 0; i < others.length; i++) {
          const m = others[i];
          const desiredOrder = i + 1;
          if (m._id.toString() === moduleId) {
            module.order = desiredOrder;
          } else if (m.order !== desiredOrder) {
            await Module.findByIdAndUpdate(m._id, { order: desiredOrder });
          }
        }
      }

      // Apply other updates
      const updatable = ['title', 'description', 'duration', 'isActive'];
      updatable.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(updateData, field)) {
          module[field] = updateData[field];
        }
      });

      await module.save();
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

      // Check if lesson order already exists and auto-adjust if needed
      if (lessonData.order) {
        const existingLesson = await Lesson.findOne({ 
          moduleId: lessonData.moduleId, 
          order: lessonData.order 
        });
        
        if (existingLesson) {
          // Find the next available order number
          const highestOrder = await Lesson.findOne({ 
            moduleId: lessonData.moduleId 
          }).sort({ order: -1 });
          
          lessonData.order = highestOrder ? highestOrder.order + 1 : 1;
        }
      } else {
        // If no order specified, set to next available
        const highestOrder = await Lesson.findOne({ 
          moduleId: lessonData.moduleId 
        }).sort({ order: -1 });
        
        lessonData.order = highestOrder ? highestOrder.order + 1 : 1;
      }

      // Auto-fetch video duration from Cloudinary if video URL is provided
      if (lessonData.content && lessonData.content.videoUrl && !lessonData.content.videoDuration) {
        try {
          const duration = await getVideoDurationFromUrl(lessonData.content.videoUrl);
          if (duration > 0) {
            lessonData.content.videoDuration = duration;
          }
        } catch (error) {
          console.warn('Could not fetch video duration automatically:', error.message);
          // Continue without video duration - not a critical error
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

      // Fetch courses and populate modules and lessons
      const courses = await Course.find(query)
        .populate('instructor', 'firstName lastName')
        .populate({
          path: 'modules',
          populate: {
            path: 'lessons',
            select: 'title description type order isFree content.videoUrl content.videoDuration',
          },
          select: 'title description order duration isActive',
        })
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

  // Admin method to get all courses (including drafts)
  async getAllCoursesAdmin(filters = {}, page = 1, limit = 10) {
    try {
      const query = { isActive: true }; // Only filter by active status for admin

      // Apply filters
      if (filters.category) query.category = filters.category;
      if (filters.level) query.level = filters.level;
      if (filters.featured) query.featured = filters.featured;
      if (filters.status) query.status = filters.status; // Allow status filtering for admin
      if (filters.search) {
        query.$text = { $search: filters.search };
      }

      const skip = (page - 1) * limit;

      // Fetch courses and populate modules and lessons for admin
      const courses = await Course.find(query)
        .populate("instructor", "firstName lastName email")
        .populate({
          path: "modules",
          populate: {
            path: "lessons",
            select: "title description type order isFree content.videoUrl content.videoDuration",
          },
          select: "title description order duration isActive",
        })
        .select("-__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

        
      const total = await Course.countDocuments(query);

      return {
        courses,
        pagination: {
          current: parseInt(page),
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

      // Check if user is already enrolled
      const existingProgress = await UserCourseProgress.findOne({
        userId,
        courseId,
      });

      if (existingProgress) {
        throw new Error("You are already enrolled in this course");
      }

      // Check if course is paid and verify payment
      if (course.price > 0) {
        const hasPaid = await PaymentService.getCoursePaymentStatus(userId, courseId);
        if (!hasPaid) {
          throw new Error("Please purchase this course before enrolling");
        }
      }

      // Create progress tracking for user
      const progress = new UserCourseProgress({
        userId,
        courseId,
        startDate: new Date(),
        status: "in_progress",
      });

      await progress.save();

      // Increment total students count
      course.totalStudents += 1;
      await course.save();

      return progress;
    } catch (error) {
      throw error;
    }
  }

  async getUserCourseProgress(userId, courseId) {
    try {
      // Use the new Progress model instead of UserCourseProgress
      const ProgressService = (await import("./progress.service.js")).default;
      
      // Get comprehensive progress data including lessons and modules
      const progressData = await ProgressService.getUserProgress(userId, courseId);
      
      if (!progressData) {
        throw new Error("You are not enrolled in this course");
      }

      return progressData;
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
      // Get enrolled courses from Progress collection (active subscriptions)
      const Progress = (await import("../models/progress.js")).default;
      
      const enrolledCourses = await Progress.find({ userId })
        .populate({
          path: 'courseId',
          select: 'title description thumbnail category level instructor duration price',
          populate: {
            path: 'instructor',
            select: 'firstName lastName'
          }
        })
        .populate('subscriptionId', 'plan status endDate')
        .sort({ lastActivityAt: -1 });

      console.log(`Found ${enrolledCourses.length} enrolled courses for user ${userId}`);

      // Calculate statistics
      const validEnrolledCourses = enrolledCourses.filter(progress => progress.courseId); // Only count courses that populated successfully
      
      const stats = {
        totalCourses: validEnrolledCourses.length,
        completedCourses: validEnrolledCourses.filter(p => p.isCompleted).length,
        inProgressCourses: validEnrolledCourses.filter(p => !p.isCompleted).length,
        overallProgress: 0,
        totalWatchTime: 0,
      };

      if (stats.totalCourses > 0) {
        const totalProgress = validEnrolledCourses.reduce(
          (sum, course) => sum + (course.overallProgress || 0),
          0
        );
        stats.overallProgress = Math.round(totalProgress / stats.totalCourses);
        stats.totalWatchTime = validEnrolledCourses.reduce(
          (sum, course) => sum + (course.totalWatchTime || 0),
          0
        );
      }

      // Format enrolled courses data for frontend
      const formattedCourses = enrolledCourses
        .filter(progress => progress.courseId) // Filter out any courses that failed to populate
        .map(progress => ({
          courseId: progress.courseId._id,
          title: progress.courseId.title,
          description: progress.courseId.description,
          thumbnail: progress.courseId.thumbnail,
          category: progress.courseId.category,
          level: progress.courseId.level,
          instructor: progress.courseId.instructor ? {
            name: `${progress.courseId.instructor.firstName || ''} ${progress.courseId.instructor.lastName || ''}`.trim() || 'Unknown Instructor',
            id: progress.courseId.instructor._id
          } : {
            name: 'Unknown Instructor',
            id: null
          },
          duration: progress.courseId.duration,
          price: progress.courseId.price,
          subscription: progress.subscriptionId ? {
            plan: progress.subscriptionId.plan,
            status: progress.subscriptionId.status,
            endDate: progress.subscriptionId.endDate
          } : {
            plan: 'unknown',
            status: 'inactive',
            endDate: null
          },
          progress: {
            overallProgress: progress.overallProgress || 0,
            currentModuleIndex: progress.currentModuleIndex || 0,
            totalModules: progress.modules ? progress.modules.length : 0,
            isCompleted: progress.isCompleted || false,
            completedAt: progress.completedAt,
            lastActivityAt: progress.lastActivityAt,
            totalWatchTime: progress.totalWatchTime || 0
          }
        }));

      return {
        stats,
        recentCourses: formattedCourses.slice(0, 5),
        enrolledCourses: formattedCourses,
      };
    } catch (error) {
      console.error('Dashboard error details:', error);
      throw error;
    }
  }

  // Brochure management methods
  async uploadBrochure(courseId, brochureData, userId) {
    try {
      const course = await Course.findById(courseId);
      if (!course) {
        throw new Error("Course not found");
      }

      const user = await User.findById(userId);
      if (!user || !["admin", "super admin"].includes(user.role)) {
        if (course.instructor.toString() !== userId) {
          throw new Error("You can only upload brochure for your own courses");
        }
      }

      const updatedCourse = await Course.findByIdAndUpdate(
        courseId,
        { 
          brochure: {
            ...brochureData,
            uploadedAt: new Date()
          }
        },
        { new: true, runValidators: true }
      ).populate('instructor', 'firstName lastName email');

      return updatedCourse;
    } catch (error) {
      throw error;
    }
  }

  async getBrochure(courseId) {
    try {
      const course = await Course.findById(courseId).select('brochure title');
      if (!course) {
        throw new Error("Course not found");
      }

      return course.brochure;
    } catch (error) {
      throw error;
    }
  }

  async updateLesson(lessonId, updateData, userId) {
    try {
      const lesson = await Lesson.findById(lessonId).populate('courseId');
      if (!lesson) {
        throw new Error("Lesson not found");
      }

      // Check permissions
      const user = await User.findById(userId);
      if (!user || !["admin", "super admin"].includes(user.role)) {
        if (lesson.courseId.instructor.toString() !== userId) {
          throw new Error("You can only edit lessons in your own courses");
        }
      }

      // Auto-fetch video duration if video URL is updated and duration not provided
      if (updateData.content && updateData.content.videoUrl && !updateData.content.videoDuration) {
        try {
          const duration = await getVideoDurationFromUrl(updateData.content.videoUrl);
          if (duration > 0) {
            updateData.content.videoDuration = duration;
          }
        } catch (error) {
          console.warn('Could not fetch video duration automatically:', error.message);
          // Continue without video duration - not a critical error
        }
      }

      const updatedLesson = await Lesson.findByIdAndUpdate(
        lessonId,
        updateData,
        { new: true, runValidators: true }
      ).populate('moduleId courseId');

      return updatedLesson;
    } catch (error) {
      throw error;
    }
  }

  async deleteLesson(lessonId, userId) {
    try {
      const lesson = await Lesson.findById(lessonId).populate('courseId');
      if (!lesson) {
        throw new Error("Lesson not found");
      }

      // Check permissions
      const user = await User.findById(userId);
      if (!user || !["admin", "super admin"].includes(user.role)) {
        if (lesson.courseId.instructor.toString() !== userId) {
          throw new Error("You can only delete lessons in your own courses");
        }
      }

      // Remove lesson from module
      await Module.findByIdAndUpdate(
        lesson.moduleId,
        { $pull: { lessons: lessonId } }
      );

      // Delete the lesson
      await Lesson.findByIdAndDelete(lessonId);

      return { message: "Lesson deleted successfully" };
    } catch (error) {
      throw error;
    }
  }

  async deleteModule(moduleId, userId) {
    try {
      const module = await Module.findById(moduleId).populate('courseId');
      if (!module) {
        throw new Error("Module not found");
      }

      // Check permissions
      const user = await User.findById(userId);
      if (!user || !["admin", "super admin"].includes(user.role)) {
        if (module.courseId.instructor.toString() !== userId) {
          throw new Error("You can only delete modules in your own courses");
        }
      }

      // Delete all lessons in this module first
      if (module.lessons && module.lessons.length > 0) {
        await Lesson.deleteMany({ _id: { $in: module.lessons } });
      }

      // Remove module from course
      await Course.findByIdAndUpdate(
        module.courseId,
        { $pull: { modules: moduleId } }
      );

      // Update any progress records that reference this module
      const Progress = (await import("../models/progress.js")).default;
      await Progress.updateMany(
        { courseId: module.courseId },
        {
          $pull: { modules: { moduleId: moduleId } },
          $set: { updatedAt: new Date() }
        }
      );

      // Delete the module
      await Module.findByIdAndDelete(moduleId);

      return { message: "Module and all its lessons deleted successfully" };
    } catch (error) {
      throw error;
    }
  }
}

export default new CourseService();
