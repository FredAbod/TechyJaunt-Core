import express from "express";
import { handlePaystackWebhook, testWebhook } from "../controllers/webhook.controller.js";

const router = express.Router();

// Main webhook endpoint for all Paystack events
router.post("/paystack", handlePaystackWebhook);

// Test webhook endpoint for development
router.post("/test", testWebhook);

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    status: "success",
    message: "Webhook service is healthy",
    timestamp: new Date().toISOString()
  });
});

export default router;
