import Assessment from "../models/assessment.js";
import Module from "../models/module.js";
import Course from "../models/course.js";
import Progress from "../models/progress.js";
import AppError from "../../../utils/lib/appError.js";
import mongoose from "mongoose";

class AssessmentService {
  
  // Create assessment for a module (Admin/Tutor only)
  async createAssessment(assessmentData, createdBy) {
    try {
      const { moduleId, courseId, title, description, questions, passingScore, timeLimit, attemptsAllowed } = assessmentData;

      // Validate module and course exist
      const module = await Module.findById(moduleId);
      if (!module) {
        throw new AppError("Module not found", 404);
      }

      const course = await Course.findById(courseId);
      if (!course) {
        throw new AppError("Course not found", 404);
      }

      // Validate that module belongs to the course
      if (module.courseId.toString() !== courseId) {
        throw new AppError("Module does not belong to the specified course", 400);
      }

      // Validate questions
      if (!questions || questions.length < 5) {
        throw new AppError("Assessment must have at least 5 questions", 400);
      }

      if (questions.length > 20) {
        throw new AppError("Assessment cannot have more than 20 questions", 400);
      }

      // Validate each question
      questions.forEach((question, index) => {
        if (!question.question || !question.options || question.options.length < 2) {
          throw new AppError(`Question ${index + 1} must have at least 2 options`, 400);
        }

        if (question.options.length > 6) {
          throw new AppError(`Question ${index + 1} cannot have more than 6 options`, 400);
        }

        const correctAnswers = question.options.filter(opt => opt.isCorrect);
        if (correctAnswers.length !== 1) {
          throw new AppError(`Question ${index + 1} must have exactly one correct answer`, 400);
        }
      });

      // Check if assessment already exists for this module
      const existingAssessment = await Assessment.findOne({ moduleId, isActive: true });
      if (existingAssessment) {
        throw new AppError("An active assessment already exists for this module", 400);
      }

      // Add order to questions
      const orderedQuestions = questions.map((question, index) => ({
        ...question,
        order: index + 1
      }));

      const assessment = new Assessment({
        title,
        description,
        moduleId,
        courseId,
        questions: orderedQuestions,
        passingScore: passingScore || 70,
        timeLimit: timeLimit || 30,
        attemptsAllowed: attemptsAllowed || 3,
        createdBy
      });

      await assessment.save();

      return assessment;
    } catch (error) {
        if (error instanceof AppError) throw error;
      throw new AppError("Failed to create assessment", 500);
    }
  }

  // Get assessment by module ID (for students - without correct answers)
  async getAssessmentByModule(moduleId, userId) {
    try {
      const assessment = await Assessment.findOne({ 
        moduleId, 
        isActive: true 
      }).populate('moduleId courseId');

      if (!assessment) {
        throw new AppError("No assessment found for this module", 404);
      }

      // Check if user has access to this module
      const progress = await Progress.findOne({ 
        userId, 
        courseId: assessment.courseId 
      });

      if (!progress) {
        throw new AppError("You don't have access to this course", 403);
      }

      const moduleIndex = progress.modules.findIndex(m => m.moduleId.toString() === moduleId);
      if (moduleIndex === -1 || !progress.canAccessModule(moduleIndex)) {
        throw new AppError("You don't have access to this module yet", 403);
      }

      // Return assessment without correct answers
      return {
        _id: assessment._id,
        title: assessment.title,
        description: assessment.description,
        moduleId: assessment.moduleId,
        courseId: assessment.courseId,
        questions: assessment.getQuestionsForStudent(),
        passingScore: assessment.passingScore,
        timeLimit: assessment.timeLimit,
        attemptsAllowed: assessment.attemptsAllowed,
        totalQuestions: assessment.totalQuestions
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to fetch assessment", 500);
    }
  }

  // Submit assessment attempt
  async submitAssessment(assessmentId, userId, answers) {
    try {
      const assessment = await Assessment.findById(assessmentId);
      if (!assessment) {
        throw new AppError("Assessment not found", 404);
      }

      // Get user progress
      const progress = await Progress.findOne({ 
        userId, 
        courseId: assessment.courseId 
      });

      if (!progress) {
        throw new AppError("You don't have access to this course", 403);
      }

      const moduleIndex = progress.modules.findIndex(m => m.moduleId.toString() === assessment.moduleId.toString());
      if (moduleIndex === -1 || !progress.canAccessModule(moduleIndex)) {
        throw new AppError("You don't have access to this module yet", 403);
      }

      const moduleProgress = progress.modules[moduleIndex];

      // Check attempts limit
      const previousAttempts = moduleProgress.assessmentAttempts.filter(
        attempt => attempt.assessmentId.toString() === assessmentId
      );

      if (previousAttempts.length >= assessment.attemptsAllowed) {
        throw new AppError(`You have reached the maximum number of attempts (${assessment.attemptsAllowed}) for this assessment`, 400);
      }

      // Check if already passed
      const hasPassedBefore = previousAttempts.some(attempt => attempt.passed);
      if (hasPassedBefore) {
        throw new AppError("You have already passed this assessment", 400);
      }

      // Validate answers
      if (!answers || answers.length !== assessment.questions.length) {
        throw new AppError("Please answer all questions", 400);
      }

      // Calculate score
      let correctAnswers = 0;
      const processedAnswers = [];

      assessment.questions.forEach((question, index) => {
        const userAnswer = answers.find(a => a.questionId === question._id.toString());
        if (!userAnswer) {
          throw new AppError(`Missing answer for question ${index + 1}`, 400);
        }

        const selectedOption = question.options.find(
          opt => opt._id.toString() === userAnswer.selectedOptionId
        );

        if (!selectedOption) {
          throw new AppError(`Invalid option selected for question ${index + 1}`, 400);
        }

        const isCorrect = selectedOption.isCorrect;
        if (isCorrect) correctAnswers++;

        processedAnswers.push({
          questionId: question._id,
          selectedOptionId: selectedOption._id,
          isCorrect
        });
      });

      const score = Math.round((correctAnswers / assessment.questions.length) * 100);
      const passed = score >= assessment.passingScore;

      // Record attempt
      const attempt = {
        assessmentId,
        score,
        passed,
        attemptedAt: new Date(),
        answers: processedAnswers
      };

      moduleProgress.assessmentAttempts.push(attempt);

      // If passed, check if module is now completed and unlock next module
      if (passed) {
        if (progress.isModuleCompleted(moduleIndex)) {
          moduleProgress.isCompleted = true;
          moduleProgress.completedAt = new Date();
          
          // Try to unlock next module
          progress.unlockNextModule();
        }
      }

      // Update overall progress
      progress.calculateOverallProgress();
      progress.lastActivityAt = new Date();

      await progress.save();

      return {
        score,
        passed,
        correctAnswers,
        totalQuestions: assessment.questions.length,
        passingScore: assessment.passingScore,
        attemptsUsed: previousAttempts.length + 1,
        attemptsAllowed: assessment.attemptsAllowed,
        canRetake: !passed && (previousAttempts.length + 1) < assessment.attemptsAllowed
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to submit assessment", 500);
    }
  }

  // Get assessment attempts for a user
  async getAssessmentAttempts(assessmentId, userId) {
    try {
      const assessment = await Assessment.findById(assessmentId);
      if (!assessment) {
        throw new AppError("Assessment not found", 404);
      }

      const progress = await Progress.findOne({ 
        userId, 
        courseId: assessment.courseId 
      });

      if (!progress) {
        throw new AppError("You don't have access to this course", 403);
      }

      const moduleProgress = progress.modules.find(m => 
        m.moduleId.toString() === assessment.moduleId.toString()
      );

      if (!moduleProgress) {
        return [];
      }

      const attempts = moduleProgress.assessmentAttempts.filter(
        attempt => attempt.assessmentId.toString() === assessmentId
      );

      return attempts.map(attempt => ({
        score: attempt.score,
        passed: attempt.passed,
        attemptedAt: attempt.attemptedAt
      }));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to fetch assessment attempts", 500);
    }
  }

  // Update assessment (Admin/Tutor only)
  async updateAssessment(assessmentId, updateData, updatedBy) {
    try {
      const assessment = await Assessment.findById(assessmentId);
      if (!assessment) {
        throw new AppError("Assessment not found", 404);
      }

      // If questions are being updated, validate them
      if (updateData.questions) {
        if (updateData.questions.length < 5 || updateData.questions.length > 20) {
          throw new AppError("Assessment must have between 5 and 20 questions", 400);
        }

        updateData.questions.forEach((question, index) => {
          if (!question.question || !question.options || question.options.length < 2) {
            throw new AppError(`Question ${index + 1} must have at least 2 options`, 400);
          }

          const correctAnswers = question.options.filter(opt => opt.isCorrect);
          if (correctAnswers.length !== 1) {
            throw new AppError(`Question ${index + 1} must have exactly one correct answer`, 400);
          }

          question.order = index + 1;
        });
      }

      Object.assign(assessment, updateData);
      await assessment.save();

      return assessment;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to update assessment", 500);
    }
  }

  // Delete assessment (Admin/Tutor only)
  async deleteAssessment(assessmentId) {
    try {
      const assessment = await Assessment.findById(assessmentId);
      if (!assessment) {
        throw new AppError("Assessment not found", 404);
      }

      // Soft delete by setting isActive to false
      assessment.isActive = false;
      await assessment.save();

      return { message: "Assessment deleted successfully" };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to delete assessment", 500);
    }
  }

  // Get all assessments for a course (Admin/Tutor only)
  async getCourseAssessments(courseId) {
    try {
      const assessments = await Assessment.find({ 
        courseId, 
        isActive: true 
      })
      .populate('moduleId', 'title order')
      .populate('createdBy', 'firstName lastName email')
      .sort({ 'moduleId.order': 1 });

      return assessments;
    } catch (error) {
      throw new AppError("Failed to fetch course assessments", 500);
    }
  }
}

export default new AssessmentService();
