import mongoose from "mongoose";

const tutorAvailabilitySchema = new mongoose.Schema(
  {
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    dayOfWeek: {
      type: String,
      enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      required: true
    },
    timeSlots: [{
      startTime: {
        type: String, // Format: "HH:MM" (24-hour format)
        required: true
      },
      endTime: {
        type: String, // Format: "HH:MM" (24-hour format)
        required: true
      },
      isAvailable: {
        type: Boolean,
        default: true
      },
      sessionDuration: {
        type: Number, // Duration in minutes
        default: 60
      },
      maxBookings: {
        type: Number, // Max sessions in this time slot
        default: 1
      },
      currentBookings: {
        type: Number,
        default: 0
      }
    }],
    timezone: {
      type: String,
      default: "UTC"
    },
    isRecurring: {
      type: Boolean,
      default: true // If true, applies to all weeks
    },
    specificDate: {
      type: Date // For one-time availability
    },
    courseSpecific: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course" // If availability is for a specific course only
    },
    hourlyRate: {
      amount: {
        type: Number,
        default: 0
      },
      currency: {
        type: String,
        default: "USD"
      }
    },
    description: {
      type: String,
      maxlength: 500
    },
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

// Indexes for efficient queries
tutorAvailabilitySchema.index({ tutorId: 1, dayOfWeek: 1 });
tutorAvailabilitySchema.index({ tutorId: 1, isActive: 1 });
tutorAvailabilitySchema.index({ courseSpecific: 1 });

export default mongoose.model("TutorAvailability", tutorAvailabilitySchema);
