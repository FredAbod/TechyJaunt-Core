import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    lastMessagePreview: {
      type: String,
      default: "",
      maxlength: 200,
    },
    studentLastNotifiedAt: {
      type: Date,
      default: null,
    },
    tutorLastNotifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, versionKey: false },
);

conversationSchema.index({ studentId: 1, tutorId: 1 }, { unique: true });
conversationSchema.index({ studentId: 1, lastMessageAt: -1 });
conversationSchema.index({ tutorId: 1, lastMessageAt: -1 });

export default mongoose.model("TutorStudentConversation", conversationSchema);
