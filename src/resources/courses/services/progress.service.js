import Progress from "../models/progress.js";
import Module from "../models/module.js";
import Course from "../models/course.js";
import PrerecordedClass from "../models/prerecordedClass.js";
import Subscription from "../../payments/models/subscription.js";
import AppError from "../../../utils/lib/appError.js";
import mongoose from "mongoose";
import Lesson from "../models/lesson.js";

class ProgressService {
  // Initialize progress when user subscribes to a course
  async initializeProgress(userId, courseId, subscriptionId) {
    try {
      // Check if progress already exists
      const existingProgress = await Progress.findOne({ userId, courseId });
      if (existingProgress) {
        return existingProgress;
      }

      // Get course modules
      const modules = await Module.find({ courseId, isActive: true }).sort({
        order: 1,
      });

      if (!modules || modules.length === 0) {
        throw new AppError("No modules found for this course", 404);
      }

      // Initialize module progress
      const moduleProgress = [];

      for (let i = 0; i < modules.length; i++) {
        const module = modules[i];

        // Get lessons/videos for this module using Lesson model
        const lessons = await Lesson.find({
          moduleId: module._id,
          isActive: true,
        }).select("_id duration");

        const moduleData = {
          moduleId: module._id,
          lessons: lessons.map((lesson) => ({
            lessonId: lesson._id,
            watchTime: 0,
            totalDuration: lesson.duration || 0,
            isCompleted: false,
            lastWatchedAt: new Date(),
          })),
          assessmentAttempts: [],
          isCompleted: false,
          unlockedAt: i === 0 ? new Date() : null, // Only unlock first module initially
        };

        moduleProgress.push(moduleData);
      }

      const progress = new Progress({
        userId,
        courseId,
        subscriptionId,
        modules: moduleProgress,
        currentModuleIndex: 0,
        overallProgress: 0,
        totalWatchTime: 0,
        lastActivityAt: new Date(),
      });

      await progress.save();
      return progress;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to initialize progress", 500);
    }
  }

  // Update video watch progress
  async updateVideoProgress(
    userId,
    courseId,
    lessonId,
    watchTime,
    totalDuration
  ) {
    try {
      const progress = await Progress.findOne({ userId, courseId });
      if (!progress) {
        throw new AppError(
          "Progress not found. Please ensure you have an active subscription.",
          404
        );
      }

      // Find the module and lesson
      let moduleIndex = -1;
      let lessonFound = false;

      for (let i = 0; i < progress.modules.length; i++) {
        const module = progress.modules[i];
        const lesson = module.lessons.find(
          (l) => l.lessonId.toString() === lessonId
        );

        if (lesson) {
          moduleIndex = i;
          lessonFound = true;
          break;
        }
      }

      if (!lessonFound) {
        // Try to find the lesson in the database and add it to progress
        console.log(
          `Lesson ${lessonId} not found in progress, searching in database...`
        );
        const lesson = await PrerecordedClass.findById(lessonId);
        if (!lesson) {
          console.log(`Lesson ${lessonId} not found in database`);

          // Let's check if the lesson exists with different criteria
          const allLessons = await PrerecordedClass.find({ courseId }).select(
            "_id title moduleId"
          );
          console.log(
            `Found ${allLessons.length} lessons for course ${courseId}:`
          );
          allLessons.forEach((l) =>
            console.log(`- ${l._id}: ${l.title} (module: ${l.moduleId})`)
          );

          throw new AppError("Lesson not found", 404);
        }

        console.log(
          `Found lesson ${lesson.title} in database, belongs to module ${lesson.moduleId}`
        );

        // Find the module this lesson belongs to
        const moduleProgressIndex = progress.modules.findIndex(
          (m) => m.moduleId.toString() === lesson.moduleId.toString()
        );

        if (moduleProgressIndex === -1) {
          console.log(`Module ${lesson.moduleId} not found in user progress`);
          throw new AppError(
            "Module not found in your progress. Please sync your progress.",
            404
          );
        }

        // Add the missing lesson to the module
        progress.modules[moduleProgressIndex].lessons.push({
          lessonId: lesson._id,
          watchTime: 0,
          totalDuration: lesson.duration || totalDuration,
          isCompleted: false,
          lastWatchedAt: new Date(),
        });

        moduleIndex = moduleProgressIndex;
        lessonFound = true;

        console.log(
          `Added missing lesson ${lessonId} to user ${userId} progress for course ${courseId}`
        );
      }

      // Check if user can access this module
      if (!progress.canAccessModule(moduleIndex)) {
        throw new AppError(
          "You don't have access to this module yet. Complete the previous module first.",
          403
        );
      }

      // Update lesson progress
      const updated = progress.updateLessonProgress(
        moduleIndex,
        lessonId,
        watchTime,
        totalDuration
      );
      if (!updated) {
        throw new AppError("Failed to update lesson progress", 500);
      }

      // Check if module is completed and unlock next module
      if (progress.isModuleCompleted(moduleIndex)) {
        const module = progress.modules[moduleIndex];
        if (!module.isCompleted) {
          module.isCompleted = true;
          module.completedAt = new Date();

          // Try to unlock next module
          progress.unlockNextModule();
        }
      }

      // Update total watch time
      progress.totalWatchTime = progress.modules.reduce((total, module) => {
        return (
          total +
          module.lessons.reduce((moduleTotal, lesson) => {
            return moduleTotal + lesson.watchTime;
          }, 0)
        );
      }, 0);

      // Calculate overall progress
      progress.calculateOverallProgress();

      // Check if course is completed
      const allModulesCompleted = progress.modules.every(
        (module) => module.isCompleted
      );
      if (allModulesCompleted && !progress.isCompleted) {
        progress.isCompleted = true;
        progress.completedAt = new Date();
      }

      await progress.save();

      return {
        lessonProgress: {
          watchTime,
          totalDuration,
          progressPercentage: Math.round((watchTime / totalDuration) * 100),
          isCompleted: watchTime / totalDuration >= 0.8,
        },
        moduleProgress: {
          moduleIndex,
          isCompleted: progress.modules[moduleIndex].isCompleted,
          canAccessNext: progress.canAccessModule(moduleIndex + 1),
        },
        overallProgress: progress.overallProgress,
        courseCompleted: progress.isCompleted,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to update video progress", 500);
    }
  }

  // Get user's progress for a course
  async getUserProgress(userId, courseId) {
    try {
      console.log("Fetching user progress for:", { userId, courseId });

      // First get the progress without population to check if it exists
      const progress = await Progress.findOne({ userId, courseId });

      if (!progress) {
        throw new AppError("Progress not found", 404);
      }

      console.log("Progress found, now populating references...");

      // Populate the progress with related data
      const populatedProgress = await Progress.findOne({ userId, courseId })
        .populate({
          path: "modules.moduleId",
          select: "title description order",
        })
        .lean(); // Use lean for better performance

      if (!populatedProgress) {
        throw new AppError("Failed to populate progress data", 500);
      }


      // Fetch all lessons for the course in one query
      const allLessons = await Lesson.find({ courseId, isActive: true });
      const lessonMap = {};
      allLessons.forEach(l => lessonMap[l._id.toString()] = l);

      for (let i = 0; i < populatedProgress.modules.length; i++) {
        const module = populatedProgress.modules[i];
        for (let j = 0; j < module.lessons.length; j++) {
          const lesson = module.lessons[j];
          const lessonData = lessonMap[lesson.lessonId.toString()];
          if (lessonData) {
            lesson.title = lessonData.title;
            lesson.description = lessonData.description;
            lesson.duration = lessonData.content?.videoDuration || lessonData.duration || lesson.totalDuration;
            lesson.totalDuration = lessonData.content?.videoDuration || lessonData.duration || lesson.totalDuration;
            lesson.type = lessonData.type;
            lesson.isFree = lessonData.isFree;
            lesson.videoUrl = lessonData.content?.videoUrl || null;
            lesson.resources = lessonData.resources || [];
            lesson.order = lessonData.order;
          } else {
            lesson.title = "Unknown Lesson";
            lesson.description = "";
            lesson.duration = lesson.totalDuration || 0;
            lesson.resources = [];
          }
        }
      }

      // Always fetch course details before returning response
      const course = await Course.findById(courseId).select("title description");

      return {
        course,
        overallProgress: populatedProgress.overallProgress,
        currentModuleIndex: populatedProgress.currentModuleIndex,
        isCompleted: populatedProgress.isCompleted,
        completedAt: populatedProgress.completedAt,
        totalWatchTime: populatedProgress.totalWatchTime,
        lastActivityAt: populatedProgress.lastActivityAt,
        modules: populatedProgress.modules.map((module, index) => {
          // Check module access - user can access module 0 by default, or if index <= currentModuleIndex
          const canAccess =
            index === 0 || index <= populatedProgress.currentModuleIndex;

          return {
            moduleId: module.moduleId._id,
            title: module.moduleId.title,
            description: module.moduleId.description,
            order: module.moduleId.order,
            isCompleted: module.isCompleted,
            completedAt: module.completedAt,
            unlockedAt: module.unlockedAt,
            canAccess: canAccess,
            lessons: module.lessons.map((lesson) => ({
              lessonId: lesson.lessonId,
              title: lesson.title || "Unknown Lesson",
              description: lesson.description || "",
              duration: lesson.duration || lesson.totalDuration,
              watchTime: lesson.watchTime,
              totalDuration: lesson.totalDuration,
              isCompleted: lesson.isCompleted,
              completedAt: lesson.completedAt,
              progressPercentage:
                lesson.totalDuration > 0
                  ? Math.round((lesson.watchTime / lesson.totalDuration) * 100)
                  : 0,
              resources: lesson.resources || [],
              type: lesson.type,
              isFree: lesson.isFree,
              videoUrl: lesson.videoUrl,
              order: lesson.order,
            })),
            assessmentAttempts: module.assessmentAttempts.map((attempt) => ({
              assessmentId: attempt.assessmentId,
              score: attempt.score,
              passed: attempt.passed,
              attemptedAt: attempt.attemptedAt,
            })),
          };
        }),
      };
    } catch (error) {
      console.error("Error in getUserProgress:", error);
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Failed to fetch user progress: ${error.message}`,
        500
      );
    }
  }

  // Get progress statistics for admin/tutor
  async getCourseProgressStats(courseId) {
    try {
      const totalStudents = await Progress.countDocuments({ courseId });

      if (totalStudents === 0) {
        return {
          totalStudents: 0,
          completedStudents: 0,
          averageProgress: 0,
          averageWatchTime: 0,
          moduleStats: [],
        };
      }

      const progressData = await Progress.aggregate([
        { $match: { courseId: new mongoose.Types.ObjectId(courseId) } },
        {
          $group: {
            _id: null,
            totalStudents: { $sum: 1 },
            completedStudents: {
              $sum: { $cond: [{ $eq: ["$isCompleted", true] }, 1, 0] },
            },
            averageProgress: { $avg: "$overallProgress" },
            averageWatchTime: { $avg: "$totalWatchTime" },
            allModules: { $push: "$modules" },
          },
        },
      ]);

      const stats = progressData[0] || {
        totalStudents: 0,
        completedStudents: 0,
        averageProgress: 0,
        averageWatchTime: 0,
        allModules: [],
      };

      // Calculate module-specific stats
      const moduleStats = [];
      if (stats.allModules.length > 0) {
        const modules = await Module.find({ courseId, isActive: true }).sort({
          order: 1,
        });

        modules.forEach((module, moduleIndex) => {
          let completedCount = 0;
          let totalProgress = 0;

          stats.allModules.forEach((studentModules) => {
            if (studentModules[moduleIndex]) {
              const moduleProgress = studentModules[moduleIndex];
              if (moduleProgress.isCompleted) completedCount++;

              // Calculate module progress percentage
              const completedLessons = moduleProgress.lessons.filter(
                (l) => l.isCompleted
              ).length;
              const totalLessons = moduleProgress.lessons.length;
              const progressPercentage =
                totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
              totalProgress += progressPercentage;
            }
          });

          moduleStats.push({
            moduleId: module._id,
            title: module.title,
            order: module.order,
            completedStudents: completedCount,
            completionRate: Math.round((completedCount / totalStudents) * 100),
            averageProgress: Math.round(totalProgress / totalStudents),
          });
        });
      }

      return {
        totalStudents: stats.totalStudents,
        completedStudents: stats.completedStudents,
        completionRate: Math.round(
          (stats.completedStudents / stats.totalStudents) * 100
        ),
        averageProgress: Math.round(stats.averageProgress),
        averageWatchTime: Math.round(stats.averageWatchTime / 3600), // Convert to hours
        moduleStats,
      };
    } catch (error) {
      throw new AppError("Failed to fetch course progress statistics", 500);
    }
  }

  // Reset user progress (Admin only)
  async resetUserProgress(userId, courseId) {
    try {
      const progress = await Progress.findOne({ userId, courseId });
      if (!progress) {
        throw new AppError("Progress not found", 404);
      }

      // Reset all progress data
      progress.modules.forEach((module) => {
        module.lessons.forEach((lesson) => {
          lesson.watchTime = 0;
          lesson.isCompleted = false;
          lesson.completedAt = null;
          lesson.lastWatchedAt = new Date();
        });
        module.assessmentAttempts = [];
        module.isCompleted = false;
        module.completedAt = null;
        module.unlockedAt = null;
      });

      // Unlock only the first module
      if (progress.modules.length > 0) {
        progress.modules[0].unlockedAt = new Date();
      }

      progress.currentModuleIndex = 0;
      progress.overallProgress = 0;
      progress.totalWatchTime = 0;
      progress.isCompleted = false;
      progress.completedAt = null;
      progress.lastActivityAt = new Date();

      await progress.save();

      return { message: "User progress reset successfully" };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to reset user progress", 500);
    }
  }

  // Get module access status
  async getModuleAccess(userId, courseId, moduleId) {
    try {
      const progress = await Progress.findOne({ userId, courseId });
      if (!progress) {
        throw new AppError("Progress not found", 404);
      }

      const moduleIndex = progress.modules.findIndex(
        (m) => m.moduleId.toString() === moduleId
      );

      if (moduleIndex === -1) {
        throw new AppError("Module not found in your progress", 404);
      }

      const canAccess = progress.canAccessModule(moduleIndex);
      const module = progress.modules[moduleIndex];

      return {
        canAccess,
        isUnlocked: module.unlockedAt !== null,
        unlockedAt: module.unlockedAt,
        isCompleted: module.isCompleted,
        completedAt: module.completedAt,
        currentModuleIndex: progress.currentModuleIndex,
        moduleIndex,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to check module access", 500);
    }
  }

  // Add missing lessons to user progress
  async addMissingLessonsToProgress(userId, courseId, moduleId = null) {
    try {
      console.log(
        `Starting addMissingLessonsToProgress for user: ${userId}, course: ${courseId}, module: ${moduleId}`
      );

      // Validate ObjectIds
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new AppError("Invalid user ID", 400);
      }
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new AppError("Invalid course ID", 400);
      }
      if (moduleId && !mongoose.Types.ObjectId.isValid(moduleId)) {
        throw new AppError("Invalid module ID", 400);
      }

      const progress = await Progress.findOne({ userId, courseId });
      if (!progress) {
        throw new AppError("Progress not found", 404);
      }

      console.log(
        `Found progress document with ${progress.modules.length} modules`
      );

      let modulesToUpdate = [];

      if (moduleId) {
        // Update specific module
        console.log(`Looking for specific module: ${moduleId}`);
        const module = await Module.findById(moduleId);
        if (!module) {
          throw new AppError("Module not found", 404);
        }
        console.log(
          `Found module: ${module.title}, courseId: ${module.courseId}`
        );

        if (module.courseId.toString() !== courseId.toString()) {
          throw new AppError("Module does not belong to this course", 400);
        }
        modulesToUpdate.push(module);
      } else {
        // Update all modules for the course
        console.log(`Getting all modules for course: ${courseId}`);
        modulesToUpdate = await Module.find({ courseId, isActive: true }).sort({
          order: 1,
        });
        console.log(
          `Found ${modulesToUpdate.length} active modules for course`
        );
      }

      if (modulesToUpdate.length === 0) {
        return {
          message: "No modules found to update",
          lessonsAdded: 0,
        };
      }

      let lessonsAdded = 0;

      for (const module of modulesToUpdate) {
        console.log(`Processing module: ${module._id} - ${module.title}`);

        // Find the module in progress
        const moduleProgressIndex = progress.modules.findIndex(
          (m) => m.moduleId.toString() === module._id.toString()
        );

        console.log(`Module progress index: ${moduleProgressIndex}`);

        if (moduleProgressIndex === -1) {
          // Module not in progress, add it
          console.log(
            `Module not found in progress, adding new module progress`
          );

          const lessons = await Lesson.find({
            moduleId: module._id,
            isActive: true,
          }).select("_id duration");

          console.log(
            `Found ${lessons.length} lessons for module ${module._id}`
          );

          const moduleData = {
            moduleId: module._id,
            lessons: lessons.map((lesson) => ({
              lessonId: lesson._id,
              watchTime: 0,
              totalDuration: lesson.duration || 0,
              isCompleted: false,
              lastWatchedAt: new Date(),
            })),
            assessmentAttempts: [],
            isCompleted: false,
            unlockedAt: null,
          };

          progress.modules.push(moduleData);
          lessonsAdded += lessons.length;
          console.log(`Added ${lessons.length} lessons for new module`);
        } else {
          // Module exists, check for missing lessons
          console.log(
            `Module exists in progress, checking for missing lessons`
          );

          const moduleProgress = progress.modules[moduleProgressIndex];
          const existingLessonIds = moduleProgress.lessons.map((l) =>
            l.lessonId.toString()
          );

          console.log(
            `Existing lessons in progress: ${existingLessonIds.length}`
          );

          const allLessons = await Lesson.find({
            moduleId: module._id,
            isActive: true,
          }).select("_id duration");

          console.log(`All active lessons in database: ${allLessons.length}`);

          for (const lesson of allLessons) {
            if (!existingLessonIds.includes(lesson._id.toString())) {
              // Add missing lesson
              console.log(`Adding missing lesson: ${lesson._id}`);
              moduleProgress.lessons.push({
                lessonId: lesson._id,
                watchTime: 0,
                totalDuration: lesson.duration || 0,
                isCompleted: false,
                lastWatchedAt: new Date(),
              });
              lessonsAdded++;
            }
          }

          console.log(
            `Added ${lessonsAdded} missing lessons to existing module`
          );
        }
      }

      console.log(`Total lessons added: ${lessonsAdded}`);

      if (lessonsAdded > 0) {
        progress.lastActivityAt = new Date();
        await progress.save();
        console.log(`Progress saved successfully`);
      }

      return {
        message: `Successfully added ${lessonsAdded} missing lessons to progress`,
        lessonsAdded,
      };
    } catch (error) {
      console.error("Error in addMissingLessonsToProgress:", error);
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Failed to add missing lessons to progress: ${error.message}`,
        500
      );
    }
  }

  // Sync all user progress with current course structure
  async syncUserProgressWithCourse(userId, courseId) {
    try {
      // Add missing lessons
      const result = await this.addMissingLessonsToProgress(userId, courseId);

      // Recalculate overall progress
      const progress = await Progress.findOne({ userId, courseId });
      if (progress) {
        progress.calculateOverallProgress();
        await progress.save();
      }

      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to sync user progress with course", 500);
    }
  }
}

export default new ProgressService();
