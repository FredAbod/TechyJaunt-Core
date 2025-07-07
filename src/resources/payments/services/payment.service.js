import axios from "axios";
import crypto from "crypto";
import CoursePayment from "../models/coursePayment.js";
import AppError from "../../../utils/lib/appError.js";
import { PAYSTACK_SECRET_KEY } from "../../../utils/helper/config.js";
import { generateRandomString } from "../../../utils/helper/helper.js";

class PaymentService {
  constructor() {
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
        callback_url: `${process.env.FRONTEND_URL}/courses/${course._id}/payment/verify`,
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
      if (error.name === 'ValidationError') {
        throw error;
      }
      throw new AppError(error.message || "Payment initialization failed", error.status || 500);
    }
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(reference) {
    try {
      const payment = await CoursePayment.findOne({ transactionReference: reference });
      if (!payment) {
        throw new AppError("Payment not found", 404);
      }

      // Verify with Paystack
      const response = await this.paystackApi.get(`/transaction/verify/${reference}`);

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
      throw new AppError(error.message || "Payment verification failed", error.status || 500);
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
        const payment = await CoursePayment.findOne({ transactionReference: reference });
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
      throw new AppError(error.message || "Webhook processing failed", error.status || 500);
    }
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(reference) {
    try {
      const payment = await CoursePayment.findOne({ transactionReference: reference })
        .populate("user", "firstName lastName email")
        .populate("course", "title price");

      if (!payment) {
        throw new AppError("Payment not found", 404);
      }

      return payment;
    } catch (error) {
      throw new AppError(error.message || "Failed to get payment details", error.status || 500);
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
      throw new AppError(error.message || "Failed to check payment status", error.status || 500);
    }
  }
}

export default new PaymentService();
