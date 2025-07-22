import mongoose from "mongoose";

const assessmentQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true,
  },
  options: [{
    text: {
      type: String,
      required: true,
      trim: true,
    },
    isCorrect: {
      type: Boolean,
      required: true,
      default: false,
    }
  }],
  explanation: {
    type: String,
    trim: true,
  },
  order: {
    type: Number,
    required: true,
  }
}, { _id: true });

const assessmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    questions: [assessmentQuestionSchema],
    passingScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 70, // 70% to pass
    },
    timeLimit: {
      type: Number, // Time limit in minutes
      default: 30,
    },
    attemptsAllowed: {
      type: Number,
      default: 3, // Allow 3 attempts
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for efficient queries
assessmentSchema.index({ moduleId: 1 });
assessmentSchema.index({ courseId: 1 });
assessmentSchema.index({ moduleId: 1, isActive: 1 });

// Virtual for total number of questions
assessmentSchema.virtual('totalQuestions').get(function() {
  return this.questions ? this.questions.length : 0;
});

// Method to validate minimum questions
assessmentSchema.methods.hasMinimumQuestions = function() {
  return this.questions && this.questions.length >= 5;
};

// Method to get questions without correct answers (for student view)
assessmentSchema.methods.getQuestionsForStudent = function() {
  return this.questions.map(q => ({
    _id: q._id,
    question: q.question,
    options: q.options.map(opt => ({
      _id: opt._id,
      text: opt.text
    })),
    order: q.order
  }));
};

export default mongoose.model("Assessment", assessmentSchema);
