import mongoose from "mongoose";

// Schema for tracking individual lesson/video progress
const lessonProgressSchema = new mongoose.Schema({
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PrerecordedClass", // References video classes
    required: true,
  },
  watchTime: {
    type: Number, // Time watched in seconds
    default: 0,
  },
  totalDuration: {
    type: Number, // Total video duration in seconds
    required: true,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
  },
  lastWatchedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

// Schema for tracking module progress
const moduleProgressSchema = new mongoose.Schema({
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Module",
    required: true,
  },
  lessons: [lessonProgressSchema],
  assessmentAttempts: [{
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment",
      required: true,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    passed: {
      type: Boolean,
      default: false,
    },
    attemptedAt: {
      type: Date,
      default: Date.now,
    },
    answers: [{
      questionId: mongoose.Schema.Types.ObjectId,
      selectedOptionId: mongoose.Schema.Types.ObjectId,
      isCorrect: Boolean,
    }],
  }],
  isCompleted: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
  },
  unlockedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

const progressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    modules: [moduleProgressSchema],
    currentModuleIndex: {
      type: Number,
      default: 0, // Index of the current module user is working on
    },
    overallProgress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    totalWatchTime: {
      type: Number, // Total time spent watching videos in seconds
      default: 0,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index for efficient queries
progressSchema.index({ userId: 1, courseId: 1 }, { unique: true });
progressSchema.index({ subscriptionId: 1 });
progressSchema.index({ userId: 1, lastActivityAt: -1 });

// Virtual for getting current module
progressSchema.virtual('currentModule').get(function() {
  if (this.modules && this.modules[this.currentModuleIndex]) {
    return this.modules[this.currentModuleIndex];
  }
  return null;
});

// Method to check if user can access a specific module
progressSchema.methods.canAccessModule = function(moduleIndex) {
  // User can access module 0 (first module) by default
  if (moduleIndex === 0) return true;
  
  // For other modules, check if previous module is completed
  if (moduleIndex > 0 && moduleIndex <= this.currentModuleIndex) {
    return true;
  }
  
  return false;
};

// Method to update lesson progress
progressSchema.methods.updateLessonProgress = function(moduleIndex, lessonId, watchTime, totalDuration) {
  if (!this.modules[moduleIndex]) return false;
  
  const module = this.modules[moduleIndex];
  let lesson = module.lessons.find(l => l.lessonId.toString() === lessonId.toString());
  
  if (!lesson) {
    // Create new lesson progress
    lesson = {
      lessonId,
      watchTime,
      totalDuration,
      lastWatchedAt: new Date(),
    };
    module.lessons.push(lesson);
  } else {
    // Update existing lesson progress
    lesson.watchTime = Math.max(lesson.watchTime, watchTime);
    lesson.lastWatchedAt = new Date();
  }
  
  // Check if lesson is completed (watched at least 80%)
  if (lesson.watchTime / lesson.totalDuration >= 0.8) {
    lesson.isCompleted = true;
    if (!lesson.completedAt) {
      lesson.completedAt = new Date();
    }
  }
  
  this.lastActivityAt = new Date();
  return true;
};

// Method to check if module is completed
progressSchema.methods.isModuleCompleted = function(moduleIndex) {
  if (!this.modules[moduleIndex]) return false;
  
  const module = this.modules[moduleIndex];
  
  // Check if all lessons are completed
  const allLessonsCompleted = module.lessons.every(lesson => lesson.isCompleted);
  
  // Check if assessment is passed (if assessment exists)
  const hasPassedAssessment = module.assessmentAttempts.some(attempt => attempt.passed);
  
  return allLessonsCompleted && (hasPassedAssessment || module.assessmentAttempts.length === 0);
};

// Method to unlock next module
progressSchema.methods.unlockNextModule = function() {
  const currentModuleCompleted = this.isModuleCompleted(this.currentModuleIndex);
  
  if (currentModuleCompleted && this.currentModuleIndex < this.modules.length - 1) {
    this.currentModuleIndex++;
    
    // Set unlock date for next module
    if (this.modules[this.currentModuleIndex]) {
      this.modules[this.currentModuleIndex].unlockedAt = new Date();
    }
    
    return true;
  }
  
  return false;
};

// Method to calculate overall progress
progressSchema.methods.calculateOverallProgress = function() {
  if (!this.modules || this.modules.length === 0) {
    this.overallProgress = 0;
    return;
  }
  
  let totalProgress = 0;
  
  this.modules.forEach(module => {
    let moduleProgress = 0;
    const totalLessons = module.lessons.length;
    
    if (totalLessons > 0) {
      const completedLessons = module.lessons.filter(lesson => lesson.isCompleted).length;
      moduleProgress = (completedLessons / totalLessons) * 100;
    }
    
    totalProgress += moduleProgress;
  });
  
  this.overallProgress = Math.round(totalProgress / this.modules.length);
};

export default mongoose.model("Progress", progressSchema);
