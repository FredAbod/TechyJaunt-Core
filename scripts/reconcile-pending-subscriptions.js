/**
 * Reconcile pending subscriptions against Paystack.
 *
 * Usage:
 *   node scripts/reconcile-pending-subscriptions.js --dry-run
 *   node scripts/reconcile-pending-subscriptions.js
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "../src/database/db.js";
import SubscriptionService from "../src/resources/payments/services/subscription.service.js";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

async function run() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGO_URI (or MONGODB_URI) is not set");
    process.exit(1);
  }

  await connectDB(mongoUri);

  console.log(
    `Reconciling pending subscriptions${DRY_RUN ? " (dry run)" : ""}...`,
  );

  const summary = await SubscriptionService.reconcilePendingSubscriptions({
    minAgeMinutes: 2,
    limit: 100,
    dryRun: DRY_RUN,
  });

  console.log(JSON.stringify(summary, null, 2));

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (error) => {
  console.error("Reconciliation failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
