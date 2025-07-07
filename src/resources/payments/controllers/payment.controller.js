import PaymentService from "../services/payment.service.js";
import AppError from "../../../utils/lib/appError.js";
import { asyncHandler } from "../../../utils/helper/helper.js";
import Course from "../../courses/models/course.js";
import User from "../../user/models/user.js";

export const initializePayment = asyncHandler(async (req, res) => {
  const { courseId, paymentMethod } = req.body;
  const { userId } = req.user;

  // Find user
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Find course
  const course = await Course.findById(courseId);
  if (!course) {
    throw new AppError("Course not found", 404);
  }

  // Check if user has already paid for this course
  const isPaid = await PaymentService.getCoursePaymentStatus(userId, courseId);
  if (isPaid) {
    throw new AppError("You have already purchased this course", 400);
  }

  // Initialize payment
  const payment = await PaymentService.initializePayment(user, course, paymentMethod);

  res.status(200).json({
    status: "success",
    data: payment,
  });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const { reference } = req.params;

  const payment = await PaymentService.verifyPayment(reference);

  res.status(200).json({
    status: "success",
    data: payment,
  });
});

export const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-paystack-signature"];

  await PaymentService.handleWebhook(req.body, signature);

  res.status(200).json({ status: "success" });
});

export const getPaymentDetails = asyncHandler(async (req, res) => {
  const { reference } = req.params;

  const payment = await PaymentService.getPaymentDetails(reference);

  res.status(200).json({
    status: "success",
    data: payment,
  });
});
