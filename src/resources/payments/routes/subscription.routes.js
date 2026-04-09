import express from "express";
import { isAuthenticated } from "../../../middleware/isAuthenticated.js";
import {
  getSubscriptionPlans,
  initializeSubscription,
  verifySubscription,
  getUserSubscriptions,
  getUserSubscriptionStatus,
  getSubscriptionDetails,
} from "../controllers/subscription.controller.js";
import { validateRequest } from "../../../middleware/validation.middleware.js";
import { subscriptionValidation } from "../../../utils/validation/subscription.validation.js";

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

/**
 * @swagger
 * /api/v1/subscriptions/plans:
 *   get:
 *     tags:
 *       - Subscriptions
 *     summary: Get all subscription plans (public)
 *     responses:
 *       200:
 *         description: List of available subscription plans
 */
router.get("/plans", getSubscriptionPlans);

// ==================== PROTECTED ROUTES ====================

/**
 * @swagger
 * /api/v1/subscriptions/initialize:
 *   post:
 *     tags:
 *       - Subscriptions
 *     summary: Initialize subscription payment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planId:
 *                 type: string
 *               billingCycle:
 *                 type: string
 *                 enum: ["monthly", "quarterly", "annual"]
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subscription initialized with payment link
 */
router.post("/initialize", 
  isAuthenticated, 
  validateRequest(subscriptionValidation.initializeSubscription),
  initializeSubscription
);

/**
 * @swagger
 * /api/v1/subscriptions/verify/{reference}:
 *   get:
 *     tags:
 *       - Subscriptions
 *     summary: Verify subscription by reference
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
 *         description: Subscription verified and activated
 */
router.get("/verify/:reference", 
  isAuthenticated, 
  verifySubscription
);

/**
 * @swagger
 * /api/v1/subscriptions/details/{reference}:
 *   get:
 *     tags:
 *       - Subscriptions
 *     summary: Get subscription details by reference
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
 *         description: Subscription details
 */
router.get("/details/:reference", 
  isAuthenticated, 
  getSubscriptionDetails
);

/**
 * @swagger
 * /api/v1/subscriptions/my-subscriptions:
 *   get:
 *     tags:
 *       - Subscriptions
 *     summary: Get user's active subscriptions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ["active", "cancelled", "expired", "pending"]
 *     responses:
 *       200:
 *         description: User's subscription list
 */
router.get("/my-subscriptions", 
  isAuthenticated, 
  getUserSubscriptions
);

/**
 * @swagger
 * /api/v1/subscriptions/status:
 *   get:
 *     tags:
 *       - Subscriptions
 *     summary: Get current subscription status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current active subscription status
 */
router.get("/status", 
  isAuthenticated, 
  getUserSubscriptionStatus
);

// Note: Webhook handling is now centralized at /api/v1/webhooks/paystack

export default router;
