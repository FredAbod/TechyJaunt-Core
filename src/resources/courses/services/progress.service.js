import Progress from "../models/progress.js";
import Module from "../models/module.js";
import Course from "../models/course.js";
import PrerecordedClass from "../models/prerecordedClass.js";
import Subscription from "../../payments/models/subscription.js";
import AppError from "../../../utils/lib/appError.js";
import mongoose from "mongoose";

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
      const modules = await Module.find({ courseId, isActive: true })
        .sort({ order: 1 });

      if (!modules || modules.length === 0) {
        throw new AppError("No modules found for this course", 404);
      }

      // Initialize module progress
      const moduleProgress = [];
      
      for (let i = 0; i < modules.length; i++) {
        const module = modules[i];
        
        // Get lessons/videos for this module
        const lessons = await PrerecordedClass.find({ 
          moduleId: module._id,
          isActive: true 
        }).select('_id duration');

        const moduleData = {
          moduleId: module._id,
          lessons: lessons.map(lesson => ({
            lessonId: lesson._id,
            watchTime: 0,
            totalDuration: lesson.duration || 0,
            isCompleted: false,
            lastWatchedAt: new Date()
          })),
          assessmentAttempts: [],
          isCompleted: false,
          unlockedAt: i === 0 ? new Date() : null // Only unlock first module initially
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
        lastActivityAt: new Date()
      });

      await progress.save();
      return progress;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to initialize progress", 500);
    }
  }

  // Update video watch progress
  async updateVideoProgress(userId, courseId, lessonId, watchTime, totalDuration) {
    try {
      const progress = await Progress.findOne({ userId, courseId });
      if (!progress) {
        throw new AppError("Progress not found. Please ensure you have an active subscription.", 404);
      }

      // Find the module and lesson
      let moduleIndex = -1;
      let lessonFound = false;

      for (let i = 0; i < progress.modules.length; i++) {
        const module = progress.modules[i];
        const lesson = module.lessons.find(l => l.lessonId.toString() === lessonId);
        
        if (lesson) {
          moduleIndex = i;
          lessonFound = true;
          break;
        }
      }

      if (!lessonFound) {
        throw new AppError("Lesson not found in your progress", 404);
      }

      // Check if user can access this module
      if (!progress.canAccessModule(moduleIndex)) {
        throw new AppError("You don't have access to this module yet. Complete the previous module first.", 403);
      }

      // Update lesson progress
      const updated = progress.updateLessonProgress(moduleIndex, lessonId, watchTime, totalDuration);
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
        return total + module.lessons.reduce((moduleTotal, lesson) => {
          return moduleTotal + lesson.watchTime;
        }, 0);
      }, 0);

      // Calculate overall progress
      progress.calculateOverallProgress();

      // Check if course is completed
      const allModulesCompleted = progress.modules.every(module => module.isCompleted);
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
          isCompleted: watchTime / totalDuration >= 0.8
        },
        moduleProgress: {
          moduleIndex,
          isCompleted: progress.modules[moduleIndex].isCompleted,
          canAccessNext: progress.canAccessModule(moduleIndex + 1)
        },
        overallProgress: progress.overallProgress,
        courseCompleted: progress.isCompleted
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to update video progress", 500);
    }
  }

  // Get user's progress for a course
  async getUserProgress(userId, courseId) {
    try {
      const progress = await Progress.findOne({ userId, courseId })
        .populate({
          path: 'modules.moduleId',
          select: 'title description order',
          options: { sort: { order: 1 } }
        })
        .populate({
          path: 'modules.lessons.lessonId',
          select: 'title description duration order'
        });

      if (!progress) {
        throw new AppError("Progress not found", 404);
      }

      // Get course details
      const course = await Course.findById(courseId).select('title description');

      return {
        course,
        overallProgress: progress.overallProgress,
        currentModuleIndex: progress.currentModuleIndex,
        isCompleted: progress.isCompleted,
        completedAt: progress.completedAt,
        totalWatchTime: progress.totalWatchTime,
        lastActivityAt: progress.lastActivityAt,
        modules: progress.modules.map((module, index) => ({
          moduleId: module.moduleId._id,
          title: module.moduleId.title,
          description: module.moduleId.description,
          order: module.moduleId.order,
          isCompleted: module.isCompleted,
          completedAt: module.completedAt,
          unlockedAt: module.unlockedAt,
          canAccess: progress.canAccessModule(index),
          lessons: module.lessons.map(lesson => ({
            lessonId: lesson.lessonId._id,
            title: lesson.lessonId.title,
            description: lesson.lessonId.description,
            duration: lesson.lessonId.duration,
            watchTime: lesson.watchTime,
            totalDuration: lesson.totalDuration,
            isCompleted: lesson.isCompleted,
            completedAt: lesson.completedAt,
            progressPercentage: lesson.totalDuration > 0 
              ? Math.round((lesson.watchTime / lesson.totalDuration) * 100) 
              : 0
          })),
          assessmentAttempts: module.assessmentAttempts.map(attempt => ({
            assessmentId: attempt.assessmentId,
            score: attempt.score,
            passed: attempt.passed,
            attemptedAt: attempt.attemptedAt
          }))
        }))
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to fetch user progress", 500);
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
          moduleStats: []
        };
      }

      const progressData = await Progress.aggregate([
        { $match: { courseId: new mongoose.Types.ObjectId(courseId) } },
        {
          $group: {
            _id: null,
            totalStudents: { $sum: 1 },
            completedStudents: {
              $sum: { $cond: [{ $eq: ["$isCompleted", true] }, 1, 0] }
            },
            averageProgress: { $avg: "$overallProgress" },
            averageWatchTime: { $avg: "$totalWatchTime" },
            allModules: { $push: "$modules" }
          }
        }
      ]);

      const stats = progressData[0] || {
        totalStudents: 0,
        completedStudents: 0,
        averageProgress: 0,
        averageWatchTime: 0,
        allModules: []
      };

      // Calculate module-specific stats
      const moduleStats = [];
      if (stats.allModules.length > 0) {
        const modules = await Module.find({ courseId, isActive: true })
          .sort({ order: 1 });

        modules.forEach((module, moduleIndex) => {
          let completedCount = 0;
          let totalProgress = 0;

          stats.allModules.forEach(studentModules => {
            if (studentModules[moduleIndex]) {
              const moduleProgress = studentModules[moduleIndex];
              if (moduleProgress.isCompleted) completedCount++;
              
              // Calculate module progress percentage
              const completedLessons = moduleProgress.lessons.filter(l => l.isCompleted).length;
              const totalLessons = moduleProgress.lessons.length;
              const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
              totalProgress += progressPercentage;
            }
          });

          moduleStats.push({
            moduleId: module._id,
            title: module.title,
            order: module.order,
            completedStudents: completedCount,
            completionRate: Math.round((completedCount / totalStudents) * 100),
            averageProgress: Math.round(totalProgress / totalStudents)
          });
        });
      }

      return {
        totalStudents: stats.totalStudents,
        completedStudents: stats.completedStudents,
        completionRate: Math.round((stats.completedStudents / stats.totalStudents) * 100),
        averageProgress: Math.round(stats.averageProgress),
        averageWatchTime: Math.round(stats.averageWatchTime / 3600), // Convert to hours
        moduleStats
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
      progress.modules.forEach(module => {
        module.lessons.forEach(lesson => {
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

      const moduleIndex = progress.modules.findIndex(m => 
        m.moduleId.toString() === moduleId
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
        moduleIndex
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to check module access", 500);
    }
  }
}

export default new ProgressService();
