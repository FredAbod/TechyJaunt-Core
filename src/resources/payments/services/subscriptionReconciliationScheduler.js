import cron from "node-cron";
import SubscriptionService from "./subscription.service.js";
import logger from "../../../utils/log/logger.js";

let reconciliationInProgress = false;

// Every 5 minutes, activate pending subscriptions that Paystack already marked successful.
cron.schedule("*/5 * * * *", async () => {
  if (reconciliationInProgress) {
    return;
  }

  reconciliationInProgress = true;

  try {
    const summary = await SubscriptionService.reconcilePendingSubscriptions({
      minAgeMinutes: 2,
      limit: 50,
    });

    if (summary.checked > 0) {
      logger.info("[SubscriptionReconciliation] completed", summary);
    }
  } catch (error) {
    logger.error(
      `[SubscriptionReconciliation] scheduler error: ${error.message}`,
    );
  } finally {
    reconciliationInProgress = false;
  }
});

export default cron;
