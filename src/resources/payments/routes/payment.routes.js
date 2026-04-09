import express from "express";
import { isAuthenticated } from "../../../middleware/isAuthenticated.js";
import {
  initializePayment,
  verifyPayment,
  getPaymentDetails,
  getUserPaidCourses,
  getUserPaymentSummary,
  getUserPaymentStatus,
  getPaymentHistory,
} from "../controllers/payment.controller.js";
import { validateRequest } from "../../../middleware/validation.middleware.js";
import { paymentValidation } from "../../../utils/validation/payment.validation.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/payments/initialize:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Initialize a payment transaction
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               courseId:
 *                 type: string
 *               amount:
 *                 type: number
 *               email:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *                 enum: ["paystack", "credit_card"]
 *     responses:
 *       200:
 *         description: Payment initialized with authorization URL
 */
router.post(
  "/initialize",
  isAuthenticated,
  validateRequest(paymentValidation.initializePayment),
  initializePayment,
);

/**
 * @swagger
 * /api/v1/payments/verify/{reference}:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Verify a payment by reference
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment reference ID from Paystack
 *     responses:
 *       200:
 *         description: Payment verified and processed
 */
router.get("/verify/:reference", isAuthenticated, verifyPayment);

/**
 * @swagger
 * /api/v1/payments/details/{reference}:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get payment details by reference
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details including amounts and course info
 */
router.get("/details/:reference", isAuthenticated, getPaymentDetails);

/**
 * @swagger
 * /api/v1/payments/my-courses:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get user's paid courses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of courses user has paid for
 */
router.get("/my-courses", isAuthenticated, getUserPaidCourses);

/**
 * @swagger
 * /api/v1/payments/summary:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get user's payment summary
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment summary with total spent and transactions count
 */
router.get("/summary", isAuthenticated, getUserPaymentSummary);

/**
 * @swagger
 * /api/v1/payments/status:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get user's payment status for subscription
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active subscription status and payment information
 */
router.get("/status", isAuthenticated, getUserPaymentStatus);

/**
 * @swagger
 * /api/v1/payments/history:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get user's payment history
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ["completed", "pending", "failed"]
 *     responses:
 *       200:
 *         description: List of all user payment transactions
 */
router.get("/history", isAuthenticated, getPaymentHistory);

export default router;
