import mongoose from "mongoose";

const liveClassSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    scheduledDate: {
      type: Date,
      required: true
    },
    duration: {
      type: Number, // in minutes
      required: true
    },
    meetingRoom: {
      roomId: {
        type: String,
        unique: true
      },
      joinUrl: {
        type: String
      },
      password: {
        type: String
      }
    },
    status: {
      type: String,
      enum: ["scheduled", "live", "completed", "cancelled"],
      default: "scheduled"
    },
    maxParticipants: {
      type: Number,
      default: 100
    },
    participants: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      joinedAt: {
        type: Date
      },
      leftAt: {
        type: Date
      }
    }],
    recording: {
      isRecorded: {
        type: Boolean,
        default: false
      },
      recordingUrl: {
        type: String
      },
      recordingSize: {
        type: Number // in MB
      }
    },
    materials: [{
      title: {
        type: String
      },
      fileUrl: {
        type: String
      },
      fileType: {
        type: String
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Index for efficient queries
liveClassSchema.index({ courseId: 1, scheduledDate: 1 });
liveClassSchema.index({ instructor: 1, status: 1 });
liveClassSchema.index({ scheduledDate: 1, status: 1 });

export default mongoose.model("LiveClass", liveClassSchema);
