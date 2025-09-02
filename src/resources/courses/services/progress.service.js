import Progress from "../models/progress.js";
import Module from "../models/module.js";
import Course from "../models/course.js";
import PrerecordedClass from "../models/prerecordedClass.js";
import Subscription from "../../payments/models/subscription.js";
import AppError from "../../../utils/lib/appError.js";
import mongoose from "mongoose";
import Lesson from "../models/lesson.js";
import logger from "../../../utils/log/logger.js";

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
    const startTime = Date.now();
    logger.info(`[SERVICE] updateVideoProgress started`, {
      userId,
      courseId,
      lessonId,
      watchTime,
      totalDuration
    });

    try {
      // Step 1: Find user progress
      logger.info(`[SERVICE] Step 1: Finding user progress`, { userId, courseId });
      const progress = await Progress.findOne({ userId, courseId });
      
      if (!progress) {
        logger.error(`[SERVICE] Progress not found`, { 
          userId, 
          courseId,
          message: "No progress document exists for this user-course combination"
        });
        throw new AppError(
          "Progress not found. Please ensure you have an active subscription.",
          404
        );
      }

      logger.info(`[SERVICE] Progress found`, {
        userId,
        courseId,
        progressId: progress._id,
        totalModules: progress.modules.length,
        currentModuleIndex: progress.currentModuleIndex,
        overallProgress: progress.overallProgress
      });

      // Step 2: Find the lesson in user's progress
      logger.info(`[SERVICE] Step 2: Searching for lesson in user progress`, { 
        lessonId, 
        totalModules: progress.modules.length 
      });
      
      let moduleIndex = -1;
      let lessonFound = false;
      let moduleWithLesson = null;

      for (let i = 0; i < progress.modules.length; i++) {
        const module = progress.modules[i];
        logger.debug(`[SERVICE] Checking module ${i}`, {
          moduleId: module.moduleId,
          lessonsCount: module.lessons.length
        });

        const lesson = module.lessons.find(
          (l) => l.lessonId.toString() === lessonId
        );

        if (lesson) {
          moduleIndex = i;
          lessonFound = true;
          moduleWithLesson = module;
          logger.info(`[SERVICE] Lesson found in progress`, {
            lessonId,
            moduleIndex,
            moduleId: module.moduleId,
            currentWatchTime: lesson.watchTime,
            isCompleted: lesson.isCompleted
          });
          break;
        }
      }

      if (!lessonFound) {
        logger.warn(`[SERVICE] Step 3: Lesson not found in progress, searching database`, { 
          lessonId,
          userId,
          courseId 
        });
        
        // Try to find the lesson in the database and add it to progress
        logger.info(`[SERVICE] Searching for lesson in Lesson collection`, { lessonId });
        
        // Use Lesson model instead of PrerecordedClass
        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
          logger.warn(`[SERVICE] Lesson not found in Lesson collection, checking details`, { lessonId });

          // Let's check if the lesson exists with different criteria
          const allLessons = await Lesson.find({ courseId, isActive: true }).select(
            "_id title moduleId"
          );
          logger.info(`[SERVICE] Found ${allLessons.length} active lessons for course ${courseId}:`, {
            courseId,
            totalLessons: allLessons.length,
            lessonIds: allLessons.map(l => l._id.toString())
          });
          
          allLessons.forEach((l) =>
            logger.debug(`[SERVICE] Lesson in DB: ${l._id}: ${l.title} (module: ${l.moduleId})`)
          );

          // Also check PrerecordedClass for backward compatibility
          logger.info(`[SERVICE] Checking PrerecordedClass collection for backward compatibility`, { lessonId });
          const legacyLessons = await PrerecordedClass.find({ courseId }).select(
            "_id title moduleId"
          );
          logger.info(`[SERVICE] Found ${legacyLessons.length} legacy lessons in PrerecordedClass for course ${courseId}:`, {
            courseId,
            totalLegacyLessons: legacyLessons.length,
            legacyLessonIds: legacyLessons.map(l => l._id.toString())
          });
          
          legacyLessons.forEach((l) =>
            logger.debug(`[SERVICE] Legacy lesson in DB: ${l._id}: ${l.title} (module: ${l.moduleId})`)
          );

          logger.error(`[SERVICE] Lesson not found in any collection`, {
            lessonId,
            courseId,
            activeLesson: allLessons.length,
            legacyLessons: legacyLessons.length,
            searchedCollections: ['Lesson', 'PrerecordedClass']
          });

          throw new AppError("Lesson not found", 404);
        }

        logger.info(`[SERVICE] Lesson found in database`, {
          lessonId,
          title: lesson.title,
          moduleId: lesson.moduleId,
          duration: lesson.content?.videoDuration || lesson.duration,
          type: lesson.type,
          isActive: lesson.isActive
        });

        // Step 4: Find the module this lesson belongs to
        logger.info(`[SERVICE] Step 4: Finding module in progress for lesson`, { 
          lessonModuleId: lesson.moduleId 
        });
        
        const moduleProgressIndex = progress.modules.findIndex(
          (m) => m.moduleId.toString() === lesson.moduleId.toString()
        );

        if (moduleProgressIndex === -1) {
          logger.error(`[SERVICE] Module not found in user progress`, {
            lessonModuleId: lesson.moduleId,
            userProgressModules: progress.modules.map(m => ({
              moduleId: m.moduleId.toString(),
              lessonsCount: m.lessons.length
            }))
          });
          throw new AppError(
            "Module not found in your progress. Please sync your progress.",
            404
          );
        }

        logger.info(`[SERVICE] Module found in progress, adding missing lesson`, {
          moduleProgressIndex,
          moduleId: lesson.moduleId,
          lessonId: lesson._id
        });

        // Step 5: Add the missing lesson to the module
        const newLessonProgress = {
          lessonId: lesson._id,
          watchTime: 0,
          totalDuration: lesson.content?.videoDuration || lesson.duration || totalDuration,
          isCompleted: false,
          lastWatchedAt: new Date(),
        };

        progress.modules[moduleProgressIndex].lessons.push(newLessonProgress);
        moduleIndex = moduleProgressIndex;
        lessonFound = true;
        moduleWithLesson = progress.modules[moduleProgressIndex];

        logger.info(`[SERVICE] Missing lesson added to progress`, {
          userId,
          courseId,
          lessonId,
          moduleIndex,
          newLessonDuration: newLessonProgress.totalDuration
        });
      }

      // Step 6: Check module access
      logger.info(`[SERVICE] Step 6: Checking module access`, { 
        moduleIndex,
        currentModuleIndex: progress.currentModuleIndex 
      });
      
      if (!progress.canAccessModule(moduleIndex)) {
        logger.warn(`[SERVICE] Access denied to module`, {
          moduleIndex,
          currentModuleIndex: progress.currentModuleIndex,
          canAccess: false
        });
        throw new AppError(
          "You don't have access to this module yet. Complete the previous module first.",
          403
        );
      }

      logger.info(`[SERVICE] Module access granted`, { moduleIndex });

      // Step 7: Update lesson progress
      logger.info(`[SERVICE] Step 7: Updating lesson progress`, {
        moduleIndex,
        lessonId,
        previousWatchTime: moduleWithLesson.lessons.find(l => l.lessonId.toString() === lessonId)?.watchTime || 0,
        newWatchTime: watchTime,
        totalDuration
      });

      const updated = progress.updateLessonProgress(
        moduleIndex,
        lessonId,
        watchTime,
        totalDuration
      );
      
      if (!updated) {
        logger.error(`[SERVICE] Failed to update lesson progress`, {
          moduleIndex,
          lessonId,
          watchTime,
          totalDuration
        });
        throw new AppError("Failed to update lesson progress", 500);
      }

      logger.info(`[SERVICE] Lesson progress updated successfully`, { 
        moduleIndex, 
        lessonId,
        updated: true
      });

      // Step 8: Check if module is completed and unlock next module
      logger.info(`[SERVICE] Step 8: Checking module completion`, { moduleIndex });
      
      if (progress.isModuleCompleted(moduleIndex)) {
        const module = progress.modules[moduleIndex];
        logger.info(`[SERVICE] Module is completed`, {
          moduleIndex,
          wasAlreadyMarkedComplete: module.isCompleted
        });
        
        if (!module.isCompleted) {
          module.isCompleted = true;
          module.completedAt = new Date();
          logger.info(`[SERVICE] Module marked as completed`, { moduleIndex });

          // Try to unlock next module
          const nextModuleUnlocked = progress.unlockNextModule();
          logger.info(`[SERVICE] Next module unlock attempted`, {
            moduleIndex,
            nextModuleUnlocked,
            newCurrentModuleIndex: progress.currentModuleIndex
          });
        }
      } else {
        logger.info(`[SERVICE] Module not yet completed`, { moduleIndex });
      }

      // Step 9: Update total watch time
      logger.info(`[SERVICE] Step 9: Calculating total watch time`);
      const previousTotalWatchTime = progress.totalWatchTime;
      
      progress.totalWatchTime = progress.modules.reduce((total, module) => {
        return (
          total +
          module.lessons.reduce((moduleTotal, lesson) => {
            return moduleTotal + lesson.watchTime;
          }, 0)
        );
      }, 0);

      logger.info(`[SERVICE] Total watch time updated`, {
        previousTotal: previousTotalWatchTime,
        newTotal: progress.totalWatchTime,
        difference: progress.totalWatchTime - previousTotalWatchTime
      });

      // Step 10: Calculate overall progress
      logger.info(`[SERVICE] Step 10: Calculating overall progress`);
      const previousOverallProgress = progress.overallProgress;
      progress.calculateOverallProgress();
      
      logger.info(`[SERVICE] Overall progress calculated`, {
        previousProgress: previousOverallProgress,
        newProgress: progress.overallProgress,
        difference: progress.overallProgress - previousOverallProgress
      });

      // Step 11: Check if course is completed
      logger.info(`[SERVICE] Step 11: Checking course completion`);
      const allModulesCompleted = progress.modules.every(
        (module) => module.isCompleted
      );
      
      if (allModulesCompleted && !progress.isCompleted) {
        progress.isCompleted = true;
        progress.completedAt = new Date();
        logger.info(`[SERVICE] Course marked as completed!`, {
          userId,
          courseId,
          completedAt: progress.completedAt
        });
      }

      // Step 12: Save progress
      logger.info(`[SERVICE] Step 12: Saving progress to database`);
      progress.lastActivityAt = new Date();
      await progress.save();

      const processingTime = Date.now() - startTime;
      logger.info(`[SERVICE] updateVideoProgress completed successfully`, {
        userId,
        courseId,
        lessonId,
        processingTimeMs: processingTime,
        finalOverallProgress: progress.overallProgress,
        isCompleted: progress.isCompleted
      });

      return {
        moduleIndex,
        lesson: {
          lessonId,
          watchTime,
          totalDuration,
          progressPercentage: totalDuration > 0 ? Math.round((watchTime / totalDuration) * 100) : 0,
          isCompleted: progress.modules[moduleIndex].lessons.find(l => l.lessonId.toString() === lessonId)?.isCompleted || false,
        },
        module: {
          moduleId: progress.modules[moduleIndex].moduleId,
          isCompleted: progress.modules[moduleIndex].isCompleted,
          canAccessNext: progress.canAccessModule(moduleIndex + 1),
        },
        overallProgress: progress.overallProgress,
        courseCompleted: progress.isCompleted,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`[SERVICE] updateVideoProgress failed`, {
        userId,
        courseId,
        lessonId,
        error: error.message,
        stack: error.stack,
        processingTimeMs: processingTime,
        errorType: error.constructor.name
      });
      
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

      // Process each module and validate lessons exist in DB
      for (let i = 0; i < populatedProgress.modules.length; i++) {
        const module = populatedProgress.modules[i];
        const validLessons = [];
        
        // Filter out lessons that don't exist in DB and populate valid ones
        for (let j = 0; j < module.lessons.length; j++) {
          const lesson = module.lessons[j];
          const lessonData = lessonMap[lesson.lessonId.toString()];
          
          if (lessonData) {
            // Lesson exists in DB - populate it
            lesson.title = lessonData.title;
            lesson.description = lessonData.description;
            lesson.duration = lessonData.content?.videoDuration || lessonData.duration || lesson.totalDuration;
            lesson.totalDuration = lessonData.content?.videoDuration || lessonData.duration || lesson.totalDuration;
            lesson.type = lessonData.type;
            lesson.isFree = lessonData.isFree;
            lesson.videoUrl = lessonData.content?.videoUrl || null;
            lesson.resources = lessonData.resources || [];
            lesson.order = lessonData.order;
            validLessons.push(lesson);
          } else {
            // Lesson doesn't exist in DB - log warning and skip
            console.warn(`Lesson ${lesson.lessonId} in progress not found in DB for course ${courseId}, module ${module.moduleId._id}`);
          }
        }
        
        // Replace lessons array with only valid lessons
        module.lessons = validLessons;
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

          // Determine lesson status for frontend
          const hasLessons = module.lessons && module.lessons.length > 0;
          const lessonStatus = hasLessons ? 'has_lessons' : 'no_lessons';

          return {
            moduleId: module.moduleId._id,
            title: module.moduleId.title,
            description: module.moduleId.description,
            order: module.moduleId.order,
            isCompleted: module.isCompleted,
            completedAt: module.completedAt,
            unlockedAt: module.unlockedAt,
            canAccess: canAccess,
            lessonStatus: lessonStatus, // 'has_lessons' or 'no_lessons'
            totalLessons: module.lessons ? module.lessons.length : 0,
            lessons: hasLessons ? module.lessons.map((lesson) => ({
              lessonId: lesson.lessonId,
              title: lesson.title,
              description: lesson.description,
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
            })) : [], // Empty array when no lessons, but lessonStatus indicates this
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
