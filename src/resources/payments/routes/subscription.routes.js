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

// Public routes
router.get("/plans", getSubscriptionPlans);

// Protected routes (require authentication)
router.post("/initialize", 
  isAuthenticated, 
  validateRequest(subscriptionValidation.initializeSubscription),
  initializeSubscription
);

router.get("/verify/:reference", 
  isAuthenticated, 
  verifySubscription
);

router.get("/details/:reference", 
  isAuthenticated, 
  getSubscriptionDetails
);

router.get("/my-subscriptions", 
  isAuthenticated, 
  getUserSubscriptions
);

router.get("/status", 
  isAuthenticated, 
  getUserSubscriptionStatus
);

// Note: Webhook handling is now centralized at /api/v1/webhooks/paystack

export default router;
