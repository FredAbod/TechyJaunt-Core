import crypto from "crypto";
import { successResMsg, errorResMsg } from "../../../utils/lib/response.js";
import PaymentService from "../services/payment.service.js";
import SubscriptionService from "../services/subscription.service.js";
import logger from "../../../utils/log/logger.js";
import { PAYSTACK_SECRET_KEY } from "../../../utils/helper/config.js";

/**
 * Unified Paystack Webhook Handler
 * Routes webhook events to appropriate services based on transaction metadata
 */
export const handlePaystackWebhook = async (req, res) => {
  try {
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    // Verify webhook signature
    if (hash !== req.headers['x-paystack-signature']) {
      logger.warn('Invalid webhook signature received');
      return errorResMsg(res, 400, "Invalid webhook signature");
    }

    const { event, data } = req.body;
    
    logger.info(`Webhook received: ${event} for reference: ${data.reference}`);

    // Only process successful charge events
    if (event !== 'charge.success') {
      logger.info(`Ignoring webhook event: ${event}`);
      return successResMsg(res, 200, { message: "Event acknowledged" });
    }

    // Determine transaction type based on reference pattern or metadata
    const transactionType = determineTransactionType(data);
    
    logger.info(`Transaction type determined: ${transactionType} for reference: ${data.reference}`);

    let result;

    switch (transactionType) {
      case 'subscription':
        logger.info(`Processing subscription webhook for reference: ${data.reference}`);
        result = await SubscriptionService.handleSubscriptionWebhook(req.body, req.headers['x-paystack-signature']);
        break;
        
      case 'course':
        logger.info(`Processing course payment webhook for reference: ${data.reference}`);
        result = await PaymentService.handlePaymentWebhook(req.body, req.headers['x-paystack-signature']);
        break;
        
      default:
        logger.warn(`Unknown transaction type for reference: ${data.reference}`);
        // Still return success to prevent Paystack from retrying
        return successResMsg(res, 200, { 
          message: "Webhook received but transaction type unknown",
          reference: data.reference
        });
    }

    logger.info(`Webhook processed successfully for ${transactionType}: ${data.reference}`);
    
    return successResMsg(res, 200, {
      message: `${transactionType} webhook processed successfully`,
      reference: data.reference,
      result
    });

  } catch (error) {
    logger.error(`Webhook processing error: ${error.message}`, {
      error: error.stack,
      body: req.body,
      headers: req.headers
    });
    
    // Always return 200 to prevent Paystack from retrying failed webhooks
    // Log the error for investigation
    return successResMsg(res, 200, {
      message: "Webhook received but processing failed",
      error: error.message
    });
  }
};

/**
 * Determine transaction type based on reference pattern and metadata
 */
function determineTransactionType(data) {
  const reference = data.reference;
  
  // Check reference pattern first (most reliable)
  if (reference.startsWith('TJ_SUB_')) {
    return 'subscription';
  }
  
  if (reference.startsWith('TJ_') && !reference.startsWith('TJ_SUB_')) {
    return 'course';
  }
  
  // Fallback: Check metadata for plan_type or course information
  if (data.metadata) {
    // Check custom fields in metadata
    if (data.metadata.custom_fields) {
      const planTypeField = data.metadata.custom_fields.find(
        field => field.variable_name === 'plan_type'
      );
      if (planTypeField) {
        return 'subscription';
      }
      
      const courseField = data.metadata.custom_fields.find(
        field => field.variable_name === 'course_id'
      );
      if (courseField) {
        return 'course';
      }
    }
    
    // Check direct metadata properties
    if (data.metadata.plan_type || data.metadata.subscription_plan) {
      return 'subscription';
    }
    
    if (data.metadata.course_id || data.metadata.course_title) {
      return 'course';
    }
  }
  
  // Final fallback: Check amount ranges (subscriptions are typically higher)
  const amount = data.amount;
  if (amount >= 1000000) { // ₦10,000 and above typically subscriptions
    return 'subscription';
  }
  
  // Default to course payment
  return 'course';
}

/**
 * Test webhook endpoint for development
 */
export const testWebhook = async (req, res) => {
  try {
    logger.info('Test webhook called', { body: req.body, headers: req.headers });
    
    return successResMsg(res, 200, {
      message: "Test webhook received successfully",
      timestamp: new Date().toISOString(),
      body: req.body,
      headers: {
        'x-paystack-signature': req.headers['x-paystack-signature'],
        'content-type': req.headers['content-type']
      }
    });
  } catch (error) {
    logger.error(`Test webhook error: ${error.message}`);
    return errorResMsg(res, 500, "Test webhook failed");
  }
};
