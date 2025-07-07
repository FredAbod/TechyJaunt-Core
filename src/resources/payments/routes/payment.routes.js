import express from "express";
import { isAuthenticated } from "../../../middleware/isAuthenticated.js";
import {
  initializePayment,
  verifyPayment,
  handleWebhook,
  getPaymentDetails,
} from "../controllers/payment.controller.js";
import { validate } from "../../../middleware/validation.middleware.js";
import { paymentValidation } from "../../../utils/validation/payment.validation.js";

const router = express.Router();

// Protected routes (require authentication)
router.post("/initialize", 
  isAuthenticated, 
  validate(paymentValidation.initializePayment),
  initializePayment
);

router.get("/verify/:reference", 
  isAuthenticated, 
  validate(paymentValidation.verifyPayment),
  verifyPayment
);

router.get("/details/:reference", 
  isAuthenticated, 
  validate(paymentValidation.verifyPayment),
  getPaymentDetails
);

// Webhook route (no authentication required)
router.post("/webhook",
  validate(paymentValidation.webhook),
  handleWebhook
);

export default router;
