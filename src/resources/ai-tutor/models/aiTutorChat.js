import mongoose from "mongoose";

const aiTutorChatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      default: "New Chat"
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: false
    },
    description: {
      type: String,
      maxlength: 500
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    isArchived: {
      type: Boolean,
      default: false
    },
    metadata: {
      messageCount: {
        type: Number,
        default: 0
      },
      lastMessageAt: {
        type: Date
      },
      tags: [{
        type: String
      }]
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
aiTutorChatSchema.index({ userId: 1, createdAt: -1 });
aiTutorChatSchema.index({ userId: 1, isPinned: 1, createdAt: -1 });
aiTutorChatSchema.index({ userId: 1, isArchived: 1 });

// Virtual to get related messages/history
aiTutorChatSchema.virtual('messages', {
  ref: 'AITutorHistory',
  localField: '_id',
  foreignField: 'chatId'
});

// Static method to get user's chats with pagination
aiTutorChatSchema.statics.getUserChats = async function(userId, options = {}) {
  const {
    limit = 20,
    page = 1,
    courseId,
    includeArchived = false,
    searchQuery
  } = options;

  const query = { userId };
  
  if (!includeArchived) {
    query.isArchived = false;
  }
  
  if (courseId) {
    query.courseId = courseId;
  }

  if (searchQuery) {
    query.$or = [
      { title: { $regex: searchQuery, $options: 'i' } },
      { description: { $regex: searchQuery, $options: 'i' } }
    ];
  }

  const chats = await this.find(query)
    .populate('courseId', 'title thumbnail')
    .sort({ isPinned: -1, 'metadata.lastMessageAt': -1, createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const totalCount = await this.countDocuments(query);
  const totalPages = Math.ceil(totalCount / limit);

  return {
    chats,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalItems: totalCount,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      limit: parseInt(limit)
    }
  };
};

// Static method to get a specific chat with messages
aiTutorChatSchema.statics.getChatWithMessages = async function(userId, chatId, options = {}) {
  const { messageLimit = 50, messagePage = 1 } = options;

  const chat = await this.findOne({ _id: chatId, userId })
    .populate('courseId', 'title thumbnail')
    .lean();

  if (!chat) {
    return null;
  }

  // Get messages for this chat
  const AITutorHistory = mongoose.model('AITutorHistory');
  const messages = await AITutorHistory.find({ chatId, userId })
    .sort({ createdAt: 1 })
    .limit(messageLimit * 1)
    .skip((messagePage - 1) * messageLimit)
    .lean();

  const totalMessages = await AITutorHistory.countDocuments({ chatId, userId });
  const totalMessagePages = Math.ceil(totalMessages / messageLimit);

  return {
    chat,
    messages,
    messagePagination: {
      currentPage: parseInt(messagePage),
      totalPages: totalMessagePages,
      totalItems: totalMessages,
      hasNext: messagePage < totalMessagePages,
      hasPrev: messagePage > 1,
      limit: parseInt(messageLimit)
    }
  };
};

// Method to update last message timestamp and increment count
aiTutorChatSchema.methods.updateMessageMetadata = async function() {
  this.metadata.messageCount += 1;
  this.metadata.lastMessageAt = new Date();
  await this.save();
};

// Method to auto-generate title from first message
aiTutorChatSchema.methods.generateTitle = function(firstMessage) {
  if (this.title === "New Chat" && firstMessage) {
    // Extract first few words from the message
    const words = firstMessage.split(' ').slice(0, 6);
    this.title = words.join(' ') + (firstMessage.split(' ').length > 6 ? '...' : '');
  }
};

const AITutorChat = mongoose.model("AITutorChat", aiTutorChatSchema);

export default AITutorChat;
