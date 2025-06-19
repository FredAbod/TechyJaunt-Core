import mongoose from "mongoose";

const classCommentSchema = new mongoose.Schema(
  {
    liveClassId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LiveClass",
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: 500
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    isVisible: {
      type: Boolean,
      default: true
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassComment"
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    isHighlighted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Index for efficient queries
classCommentSchema.index({ liveClassId: 1, timestamp: 1 });
classCommentSchema.index({ userId: 1 });

export default mongoose.model("ClassComment", classCommentSchema);
