import express from "express";
import { isAuthenticated } from "../../../middleware/isAuthenticated.js";
import {
  initializePayment,
  verifyPayment,
  handleWebhook,
  getPaymentDetails,
} from "../controllers/payment.controller.js";
import { validateRequest } from "../../../middleware/validation.middleware.js";
import { paymentValidation } from "../../../utils/validation/payment.validation.js";

const router = express.Router();

// Protected routes (require authentication)
router.post("/initialize", 
  isAuthenticated, 
  validateRequest(paymentValidation.initializePayment),
  initializePayment
);

router.get("/verify/:reference", 
  isAuthenticated, 
  verifyPayment
);

router.get("/details/:reference", 
  isAuthenticated, 
  getPaymentDetails
);

// Webhook route (no authentication required)
router.post("/webhook",
  handleWebhook
);

export default router;
