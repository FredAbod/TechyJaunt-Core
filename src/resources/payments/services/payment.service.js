import axios from "axios";
import crypto from "crypto";
import mongoose from "mongoose";
import CoursePayment from "../models/coursePayment.js";
import AppError from "../../../utils/lib/appError.js";
import { PAYSTACK_SECRET_KEY } from "../../../utils/helper/config.js";
import { generateRandomString } from "../../../utils/helper/helper.js";

class PaymentService {
  constructor() {
    // Validate Paystack secret key
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error("PAYSTACK_SECRET_KEY environment variable is required");
    }

    if (!PAYSTACK_SECRET_KEY.startsWith("sk_")) {
      throw new Error(
        "Invalid Paystack secret key format. Must start with 'sk_'",
      );
    }

    this.paystackApi = axios.create({
      baseURL: "https://api.paystack.co",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Initialize a payment transaction
   */
  async initializePayment(user, course, paymentMethod) {
    try {
      const transactionReference = `TJ_${generateRandomString(16)}`;

      // Create payment record
      const payment = await CoursePayment.create({
        user: user._id,
        course: course._id,
        amount: course.price * 100, // Paystack amount in kobo
        paymentMethod,
        transactionReference,
      });

      // Initialize Paystack transaction
      const response = await this.paystackApi.post("/transaction/initialize", {
        email: user.email,
        amount: course.price * 100,
        reference: transactionReference,
        // Updated callback_url to match required format
        callback_url: `http://localhost:5173/learning-hub/dashboard/${course._id}/subscription/verify?trxref=${transactionReference}&reference=${transactionReference}`,
        metadata: {
          custom_fields: [
            {
              display_name: "Course Name",
              variable_name: "course_name",
              value: course.title,
            },
            {
              display_name: "Student Name",
              variable_name: "student_name",
              value: `${user.firstName} ${user.lastName}`,
            },
          ],
        },
      });

      if (!response.data.status) {
        throw new AppError("Failed to initialize payment", 400);
      }

      // Update payment with Paystack reference
      payment.paystackReference = response.data.data.reference;
      await payment.save();

      return {
        authorizationUrl: response.data.data.authorization_url,
        reference: transactionReference,
      };
    } catch (error) {
      // If it's a validation error, throw it as is
      if (error.name === "ValidationError") {
        throw error;
      }

      // Handle Axios errors (API responses)
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.message;

        if (status === 401) {
          if (
            message.includes("IP address") ||
            message.includes("not allowed")
          ) {
            throw new AppError(
              "Your IP address is not whitelisted in Paystack. Please visit /server-info to get your IP and whitelist it in Paystack dashboard.",
              401,
            );
          } else {
            throw new AppError(
              "Invalid Paystack API key. Please check your PAYSTACK_SECRET_KEY environment variable.",
              401,
            );
          }
        } else if (status === 400) {
          throw new AppError(`Paystack API error: ${message}`, 400);
        } else {
          throw new AppError(
            `Paystack API error (${status}): ${message}`,
            status,
          );
        }
      }

      // Handle network errors
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        throw new AppError(
          "Unable to connect to Paystack API. Check your internet connection.",
          500,
        );
      }

      throw new AppError(
        error.message || "Payment initialization failed",
        error.status || 500,
      );
    }
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(reference) {
    try {
      const payment = await CoursePayment.findOne({
        transactionReference: reference,
      });
      if (!payment) {
        throw new AppError("Payment not found", 404);
      }

      // Verify with Paystack
      const response = await this.paystackApi.get(
        `/transaction/verify/${reference}`,
      );

      if (!response.data.status || response.data.data.status !== "success") {
        payment.status = "failed";
        await payment.save();
        throw new AppError("Payment verification failed", 400);
      }

      // Update payment status
      payment.status = "success";
      payment.metadata = response.data.data;
      await payment.save();

      return payment;
    } catch (error) {
      throw new AppError(
        error.message || "Payment verification failed",
        error.status || 500,
      );
    }
  }

  /**
   * Handle Paystack webhook
   */
  async handleWebhook(body, signature) {
    try {
      const hash = crypto
        .createHmac("sha512", PAYSTACK_SECRET_KEY)
        .update(JSON.stringify(body))
        .digest("hex");

      if (hash !== signature) {
        throw new AppError("Invalid webhook signature", 400);
      }

      const event = body;
      const reference = event.data.reference;

      // Handle successful charges
      if (event.event === "charge.success") {
        const payment = await CoursePayment.findOne({
          transactionReference: reference,
        });
        if (!payment) {
          throw new AppError("Payment not found", 404);
        }

        payment.status = "success";
        payment.metadata = event.data;
        await payment.save();

        return true;
      }

      return false;
    } catch (error) {
      throw new AppError(
        error.message || "Webhook processing failed",
        error.status || 500,
      );
    }
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(reference) {
    try {
      const payment = await CoursePayment.findOne({
        transactionReference: reference,
      })
        .populate("user", "firstName lastName email")
        .populate("course", "title price");

      if (!payment) {
        throw new AppError("Payment not found", 404);
      }

      return payment;
    } catch (error) {
      throw new AppError(
        error.message || "Failed to get payment details",
        error.status || 500,
      );
    }
  }

  /**
   * Get user's course payment status
   */
  async getCoursePaymentStatus(userId, courseId) {
    try {
      const payment = await CoursePayment.findOne({
        user: userId,
        course: courseId,
        status: "success",
      });

      return !!payment;
    } catch (error) {
      throw new AppError(
        error.message || "Failed to check payment status",
        error.status || 500,
      );
    }
  }

  /**
   * Get all courses a user has paid for
   */
  async getUserPaidCourses(userId) {
    try {
      // Convert userId to ObjectId if it's a string
      const userObjectId =
        typeof userId === "string"
          ? new mongoose.Types.ObjectId(userId)
          : userId;

      const paidCourses = await CoursePayment.find({
        user: userObjectId,
        status: "success",
      })
        .populate(
          "course",
          "title description thumbnail category level price duration",
        )
        .populate("user", "firstName lastName email")
        .sort({ createdAt: -1 });

      return paidCourses.map((payment) => ({
        paymentId: payment._id,
        course: payment.course,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        transactionReference: payment.transactionReference,
        paidAt: payment.createdAt,
        metadata: payment.metadata,
      }));
    } catch (error) {
      throw new AppError(
        error.message || "Failed to get paid courses",
        error.status || 500,
      );
    }
  }

  /**
   * Get user's payment summary
   */
  async getUserPaymentSummary(userId) {
    try {
      // Convert userId to ObjectId if it's a string
      const userObjectId =
        typeof userId === "string"
          ? new mongoose.Types.ObjectId(userId)
          : userId;

      const summary = await CoursePayment.aggregate([
        { $match: { user: userObjectId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);

      const result = {
        totalPaid: 0,
        totalAmount: 0,
        successfulPayments: 0,
        failedPayments: 0,
        pendingPayments: 0,
      };

      summary.forEach((item) => {
        if (item._id === "success") {
          result.totalPaid = item.totalAmount;
          result.successfulPayments = item.count;
        } else if (item._id === "failed") {
          result.failedPayments = item.count;
        } else if (item._id === "pending") {
          result.pendingPayments = item.count;
        }
        result.totalAmount += item.totalAmount;
      });

      return result;
    } catch (error) {
      throw new AppError(
        error.message || "Failed to get payment summary",
        error.status || 500,
      );
    }
  }

  /**
   * Check if user has paid for any course and get payment status
   */
  async getUserPaymentStatus(userId) {
    try {
      // Convert userId to ObjectId if it's a string
      const userObjectId =
        typeof userId === "string"
          ? new mongoose.Types.ObjectId(userId)
          : userId;

      const paymentData = await CoursePayment.aggregate([
        { $match: { user: userObjectId } },
        {
          $group: {
            _id: null,
            hasPaidCourses: {
              $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] },
            },
            totalPayments: { $sum: 1 },
            totalPaid: {
              $sum: { $cond: [{ $eq: ["$status", "success"] }, "$amount", 0] },
            },
            paidCourseIds: {
              $push: {
                $cond: [{ $eq: ["$status", "success"] }, "$course", null],
              },
            },
          },
        },
      ]);

      const result =
        paymentData.length > 0
          ? paymentData[0]
          : {
              hasPaidCourses: 0,
              totalPayments: 0,
              totalPaid: 0,
              paidCourseIds: [],
            };

      return {
        hasPaidCourses: result.hasPaidCourses > 0,
        totalPaidCourses: result.hasPaidCourses,
        totalPayments: result.totalPayments,
        totalAmountPaid: result.totalPaid,
        paidCourseIds: result.paidCourseIds.filter((id) => id !== null),
      };
    } catch (error) {
      throw new AppError(
        error.message || "Failed to get payment status",
        error.status || 500,
      );
    }
  }

  /**
   * Get user's full payment history
   */
  async getUserPaymentHistory(userId, options = {}) {
    try {
      const { page = 1, limit = 10, status } = options;

      // Convert userId to ObjectId if it's a string
      const userObjectId =
        typeof userId === "string"
          ? new mongoose.Types.ObjectId(userId)
          : userId;

      const query = { user: userObjectId };

      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;

      const payments = await CoursePayment.find(query)
        .populate("course", "title price currency")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await CoursePayment.countDocuments(query);

      return {
        payments: payments.map((payment) => ({
          id: payment._id,
          date: payment.createdAt,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          reference: payment.transactionReference,
          paymentMethod: payment.paymentMethod,
          course: payment.course
            ? {
                id: payment.course._id,
                title: payment.course.title,
              }
            : null,
          metadata: payment.metadata,
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new AppError(
        error.message || "Failed to get payment history",
        error.status || 500,
      );
    }
  }
}

export default new PaymentService();
