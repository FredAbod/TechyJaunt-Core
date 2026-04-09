import express from "express";
import { handlePaystackWebhook, testWebhook } from "../controllers/webhook.controller.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/webhooks/paystack:
 *   post:
 *     tags:
 *       - Webhooks
 *     summary: Handle Paystack webhook events
 *     description: Processes payment and subscription webhooks from Paystack
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook signature
 */
router.post("/paystack", handlePaystackWebhook);

/**
 * @swagger
 * /api/v1/webhooks/test:
 *   post:
 *     tags:
 *       - Webhooks
 *     summary: Test webhook (development only)
 *     description: Test endpoint for sending test webhook events
 *     responses:
 *       200:
 *         description: Test webhook processed
 */
router.post("/test", testWebhook);

/**
 * @swagger
 * /api/v1/webhooks/health:
 *   get:
 *     tags:
 *       - Webhooks
 *     summary: Health check endpoint
 *     responses:
 *       200:
 *         description: Webhook service is healthy
 */
router.get("/health", (req, res) => {
  res.json({
    status: "success",
    message: "Webhook service is healthy",
    timestamp: new Date().toISOString()
  });
});

export default router;
