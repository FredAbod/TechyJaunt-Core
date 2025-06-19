import mongoose from "mongoose";

const classNotificationSchema = new mongoose.Schema(
  {
    liveClassId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LiveClass",
      required: true
    },
    recipients: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },
      isRead: {
        type: Boolean,
        default: false
      },
      readAt: {
        type: Date
      }
    }],
    type: {
      type: String,
      enum: ["class_scheduled", "class_reminder", "class_started", "class_cancelled", "class_rescheduled"],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    scheduledFor: {
      type: Date // For reminder notifications
    },
    isSent: {
      type: Boolean,
      default: false
    },
    sentAt: {
      type: Date
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed // Additional data based on notification type
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Index for efficient queries
classNotificationSchema.index({ "recipients.userId": 1, "recipients.isRead": 1 });
classNotificationSchema.index({ scheduledFor: 1, isSent: 1 });
classNotificationSchema.index({ liveClassId: 1 });

export default mongoose.model("ClassNotification", classNotificationSchema);
