/**
 * Rebuild feature access for paid subscriptions from current plan rules.
 * Bronze/Gold receive course ownership; Silver remains mentorship-only.
 * Preserves mentorship sessions used.
 *
 * Usage:
 *   npm run migrate:lifetime-course-access
 *   npm run migrate:lifetime-course-access -- --dry-run
 */
import dotenv from "dotenv";
dotenv.config();

import connectDB from "../src/database/db.js";
import Subscription from "../src/resources/payments/models/subscription.js";
import SubscriptionService from "../src/resources/payments/services/subscription.service.js";

const DRY_RUN = process.argv.includes("--dry-run");

async function run() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGO_URI (or MONGODB_URI) is not set");
    process.exit(1);
  }

  console.log("Subscription feature access migration");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}\n`);

  await connectDB(mongoUri);

  const subscriptions = await Subscription.find({
    status: { $in: ["active", "expired"] },
  });

  let updated = 0;

  for (const sub of subscriptions) {
    const priorSessions =
      sub.featureAccess?.mentorship?.sessionsUsed ?? 0;
    const nextAccess = SubscriptionService.setupFeatureAccess(
      sub.plan,
      sub.startDate,
      sub.endDate,
      sub.featureAccess,
    );

    if (nextAccess.mentorship) {
      nextAccess.mentorship.sessionsUsed = priorSessions;
    }

    console.log(
      `  ${sub._id} | ${sub.plan} | ${sub.status} | user=${sub.user} course=${sub.courseId}`,
    );

    if (!DRY_RUN) {
      sub.featureAccess = nextAccess;
      await sub.save();
    }
    updated += 1;
  }

  console.log(`\nDone. ${updated} subscription(s) ${DRY_RUN ? "would be" : ""} updated.`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
