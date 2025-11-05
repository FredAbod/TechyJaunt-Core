import mongoose from "mongoose";

const aiTutorHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AITutorChat",
      required: false,
      index: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: false
    },
    interactionType: {
      type: String,
      required: true,
      enum: ["explanation", "study-plan", "question", "exercises"],
      index: true
    },
    topic: {
      type: String,
      required: true
    },
    userInput: {
      type: String,
      required: true
    },
    aiResponse: {
      type: String,
      required: true
    },
    userLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "intermediate"
    },
    metadata: {
      model: {
        type: String,
        default: "llama-3.1-8b-instant"
      },
      tokensUsed: {
        type: Number,
        default: 0
      },
      responseTime: {
        type: Number, // in milliseconds
        default: 0
      },
      sessionId: {
        type: String
      }
    },
    tags: [{
      type: String
    }],
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: {
      type: String
    },
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
aiTutorHistorySchema.index({ userId: 1, createdAt: -1 });
aiTutorHistorySchema.index({ userId: 1, interactionType: 1 });
aiTutorHistorySchema.index({ userId: 1, courseId: 1 });
aiTutorHistorySchema.index({ userId: 1, chatId: 1, createdAt: 1 });

// Virtual for formatted date
aiTutorHistorySchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString();
});

// Static method to get user history with pagination
aiTutorHistorySchema.statics.getUserHistory = function(userId, options = {}) {
  const {
    limit = 50,
    page = 1,
    courseId,
    type,
    chatId,
    startDate,
    endDate
  } = options;

  const query = { userId, isArchived: false };
  
  if (courseId) query.courseId = courseId;
  if (type) query.interactionType = type;
  if (chatId) query.chatId = chatId;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .populate('courseId', 'title thumbnail')
    .populate('chatId', 'title')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    // Include aiResponse and userInput so the question and AI answer are returned
    .lean();
};

// Static method to get detailed history item
aiTutorHistorySchema.statics.getHistoryItem = function(userId, historyId) {
  return this.findOne({ _id: historyId, userId })
    .populate('courseId', 'title thumbnail')
    .lean();
};

const AITutorHistory = mongoose.model("AITutorHistory", aiTutorHistorySchema);

export default AITutorHistory;
