import mongoose from "mongoose";

const coursePaymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "NGN",
      enum: ["NGN", "USD"],
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["card", "bank_transfer", "ussd"],
      required: true,
    },
    transactionReference: {
      type: String,
      required: true,
      unique: true,
    },
    paystackReference: {
      type: String,
      unique: true,
      sparse: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
coursePaymentSchema.index({ user: 1, course: 1 });
coursePaymentSchema.index({ transactionReference: 1 });
coursePaymentSchema.index({ paystackReference: 1 });

const CoursePayment = mongoose.model("CoursePayment", coursePaymentSchema);

export default CoursePayment;
