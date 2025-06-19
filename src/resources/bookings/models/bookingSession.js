import mongoose from "mongoose";

const bookingSessionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course"
    },
    sessionDate: {
      type: Date,
      required: true
    },
    startTime: {
      type: String, // Format: "HH:MM"
      required: true
    },
    endTime: {
      type: String, // Format: "HH:MM"
      required: true
    },
    duration: {
      type: Number, // Duration in minutes
      required: true
    },
    timezone: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed", "no_show"],
      default: "pending"
    },
    sessionType: {
      type: String,
      enum: ["one_on_one", "group", "consultation", "review"],
      default: "one_on_one"
    },
    topics: [{
      type: String
    }],
    studentNotes: {
      type: String,
      maxlength: 1000
    },
    tutorNotes: {
      type: String,
      maxlength: 1000
    },
    sessionNotes: {
      type: String,
      maxlength: 2000
    },
    meetingDetails: {
      platform: {
        type: String,
        enum: ["jitsi", "zoom", "google_meet", "in_person"],
        default: "jitsi"
      },
      meetingUrl: {
        type: String
      },
      meetingId: {
        type: String
      },
      password: {
        type: String
      },
      location: {
        type: String // For in-person sessions
      }
    },
    pricing: {
      amount: {
        type: Number,
        default: 0
      },
      currency: {
        type: String,
        default: "USD"
      },
      paymentStatus: {
        type: String,
        enum: ["pending", "paid", "refunded", "free"],
        default: "pending"
      },
      paymentMethod: {
        type: String
      },
      transactionId: {
        type: String
      }
    },
    reminders: {
      studentReminded: {
        type: Boolean,
        default: false
      },
      tutorReminded: {
        type: Boolean,
        default: false
      },
      reminderSentAt: {
        type: Date
      }
    },
    feedback: {
      studentRating: {
        type: Number,
        min: 1,
        max: 5
      },
      studentComment: {
        type: String,
        maxlength: 1000
      },
      tutorRating: {
        type: Number,
        min: 1,
        max: 5
      },
      tutorComment: {
        type: String,
        maxlength: 1000
      }
    },
    cancellationReason: {
      type: String,
      maxlength: 500
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    cancelledAt: {
      type: Date
    },
    confirmedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes for efficient queries
bookingSessionSchema.index({ studentId: 1, sessionDate: 1 });
bookingSessionSchema.index({ tutorId: 1, sessionDate: 1 });
bookingSessionSchema.index({ status: 1, sessionDate: 1 });
bookingSessionSchema.index({ courseId: 1 });

export default mongoose.model("BookingSession", bookingSessionSchema);
