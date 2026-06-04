/**
 * Recover a subscription when Paystack received payment but webhook/verify did not run.
 *
 * Usage:
 *   node scripts/recover-subscription-payment.js --email lezigaaffah@gmail.com --dry-run
 *   node scripts/recover-subscription-payment.js --email lezigaaffah@gmail.com
 *   node scripts/recover-subscription-payment.js --email user@example.com --reference TJ-SUB-XXXX
 */
import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import mongoose from "mongoose";
import connectDB from "../src/database/db.js";
import User from "../src/resources/user/models/user.js";
import Subscription from "../src/resources/payments/models/subscription.js";
import Course from "../src/resources/courses/models/course.js";
import SubscriptionService from "../src/resources/payments/services/subscription.service.js";
import { PAYSTACK_SECRET_KEY } from "../src/utils/helper/config.js";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");
const emailIdx = args.indexOf("--email");
const refIdx = args.indexOf("--reference");
const EMAIL = emailIdx >= 0 ? args[emailIdx + 1] : null;
const FORCED_REFERENCE = refIdx >= 0 ? args[refIdx + 1] : null;

function usage() {
  console.log(`
Recover subscription after missed Paystack webhook

  node scripts/recover-subscription-payment.js --email <user@email.com> [--reference <ref>] [--dry-run] [--force]

Options:
  --email       Customer email (required)
  --reference   Paystack transaction reference to activate (required with --force)
  --dry-run     Show what would happen without writing to the database
  --force       Skip Paystack verify and activate (use only after confirming payment in Paystack dashboard)
`);
}

async function verifyWithPaystack(reference) {
  const response = await axios.get(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    },
  );
  return response.data;
}

function printSubscription(sub, index) {
  console.log(
    `  [${index}] id=${sub._id} plan=${sub.plan} status=${sub.status} ref=${sub.transactionReference} course=${sub.courseId?.title || sub.courseId} created=${sub.createdAt?.toISOString?.() || sub.createdAt}`,
  );
}

async function run() {
  if (!EMAIL) {
    usage();
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGO_URI (or MONGODB_URI) is not set");
    process.exit(1);
  }

  if (!PAYSTACK_SECRET_KEY) {
    console.error("PAYSTACK_SECRET_KEY is not set");
    process.exit(1);
  }

  console.log("Subscription payment recovery");
  console.log(`Email: ${EMAIL}`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}\n`);

  await connectDB(mongoUri);

  const user = await User.findOne({ email: EMAIL.toLowerCase().trim() });
  if (!user) {
    console.error(`No user found with email: ${EMAIL}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`User: ${user.firstName} ${user.lastName} (${user._id})\n`);

  const subscriptions = await Subscription.find({ user: user._id })
    .populate("courseId", "title")
    .sort({ createdAt: 1 });

  if (!subscriptions.length) {
    console.log("No subscriptions found for this user.");
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log("All subscriptions:");
  subscriptions.forEach((sub, i) => printSubscription(sub, i + 1));

  const active = subscriptions.filter((s) => s.status === "active");
  if (active.length) {
    console.log("\nUser already has active subscription(s):");
    active.forEach((sub, i) => printSubscription(sub, i + 1));
    console.log("\nNo action needed unless access is still missing (check progress/courseId).");
    await mongoose.disconnect();
    process.exit(0);
  }

  const pending = subscriptions.filter((s) => s.status === "pending");
  const recoverable = subscriptions.filter((s) =>
    ["pending", "failed"].includes(s.status),
  );

  if (!recoverable.length && !FORCED_REFERENCE) {
    console.error(
      "\nNo pending or failed subscriptions to recover. Check Paystack reference manually.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  if (!pending.length && !FORCED_REFERENCE) {
    console.log(
      "\nNo pending subscriptions; pass --reference with --force to recover a failed record.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const findRecoverable = (reference) =>
    recoverable.find((s) => s.transactionReference === reference);

  let targetReference = FORCED_REFERENCE;
  let paystackStatus = null;

  if (FORCE) {
    if (!FORCED_REFERENCE) {
      console.error("--force requires --reference (the Paystack ref you confirmed as paid).");
      await mongoose.disconnect();
      process.exit(1);
    }
    const match = findRecoverable(FORCED_REFERENCE);
    if (!match) {
      console.error(
        `Reference ${FORCED_REFERENCE} is not among this user's pending/failed subscriptions.`,
      );
      await mongoose.disconnect();
      process.exit(1);
    }
    targetReference = FORCED_REFERENCE;
    console.log(`\n--force: skipping Paystack verify, activating ${targetReference}`);
  } else if (targetReference) {
    const match = findRecoverable(targetReference);
    if (!match) {
      console.error(
        `Reference ${targetReference} is not among this user's pending/failed subscriptions.`,
      );
      await mongoose.disconnect();
      process.exit(1);
    }
    console.log(`\nUsing provided reference: ${targetReference}`);
    if (!DRY_RUN) {
      const paystack = await verifyWithPaystack(targetReference);
      paystackStatus = paystack?.data?.status;
      if (!paystack.status || paystackStatus !== "success") {
        console.error(`Paystack verification failed for ${targetReference}:`, paystack?.message || paystackStatus);
        await mongoose.disconnect();
        process.exit(1);
      }
    } else {
      try {
        const paystack = await verifyWithPaystack(targetReference);
        paystackStatus = paystack?.data?.status;
        console.log(`Paystack status for ${targetReference}: ${paystackStatus}`);
      } catch (err) {
        console.warn(`Could not verify with Paystack: ${err.message}`);
      }
    }
  } else {
    console.log("\nChecking Paystack for successful payment among pending references...");
    for (const sub of pending) {
      const ref = sub.transactionReference;
      try {
        const paystack = await verifyWithPaystack(ref);
        const status = paystack?.data?.status;
        const amount = paystack?.data?.amount;
        console.log(`  ${ref}: Paystack=${status}${amount ? ` amount=${amount / 100} ${paystack?.data?.currency}` : ""}`);
        if (paystack.status && status === "success" && !targetReference) {
          targetReference = ref;
          paystackStatus = status;
        }
      } catch (err) {
        console.log(`  ${ref}: verify error — ${err.response?.data?.message || err.message}`);
      }
    }

    if (!targetReference) {
      console.error(
        "\nNo successful Paystack payment found among pending subscriptions.",
        "Pass --reference <ref> if you know the successful transaction reference.",
      );
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`\nSelected reference to activate: ${targetReference}`);
  }

  const targetSub =
    findRecoverable(targetReference) ||
    subscriptions.find((s) => s.transactionReference === targetReference);
  const otherPending = pending.filter(
    (s) => s.transactionReference !== targetReference,
  );

  if (DRY_RUN) {
    console.log("\nDry run — would:");
    console.log(`  • Activate subscription ${targetSub._id} (ref ${targetReference})`);
    console.log(`  • Initialize course progress for course ${targetSub.courseId?._id || targetSub.courseId}`);
    if (otherPending.length) {
      console.log(`  • Mark ${otherPending.length} other pending attempt(s) as failed:`);
      otherPending.forEach((s) => console.log(`      - ${s.transactionReference}`));
    }
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log("\nActivating subscription...");
  let activated;

  if (FORCE) {
    const sub = await Subscription.findOne({
      transactionReference: targetReference,
      user: user._id,
    });
    sub.status = "active";
    sub.featureAccess = SubscriptionService.setupFeatureAccess(
      sub.plan,
      sub.startDate,
      sub.endDate,
    );
    sub.metadata = {
      ...(sub.metadata || {}),
      manualRecovery: true,
      recoveredAt: new Date().toISOString(),
      recoveredBy: "recover-subscription-payment.js",
    };
    await sub.save();

    const progressService = (
      await import("../src/resources/courses/services/progress.service.js")
    ).default;
    await progressService.initializeProgress(
      sub.user,
      sub.courseId,
      sub._id,
    );
    await Course.findByIdAndUpdate(sub.courseId, { $inc: { totalStudents: 1 } });
    activated = sub;
  } else {
    activated = await SubscriptionService.verifySubscription(targetReference);
  }

  if (activated.status !== "active") {
    console.error(`Activation failed — subscription status is "${activated.status}"`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Activated: ${activated._id} (${activated.plan}, course ${activated.courseId})`);

  if (otherPending.length) {
    const now = new Date();
    for (const sub of otherPending) {
      sub.status = "failed";
      sub.metadata = {
        ...(sub.metadata || {}),
        recoveryNote: `Superseded by successful payment ${targetReference} on ${now.toISOString()}`,
        closedByRecoveryScript: true,
      };
      await sub.save();
      console.log(`Closed duplicate pending: ${sub.transactionReference}`);
    }
  }

  const Progress = (await import("../src/resources/courses/models/progress.js")).default;
  const progress = await Progress.findOne({
    userId: user._id,
    courseId: activated.courseId,
  });

  console.log("\nDone.");
  console.log(`Subscription status: ${activated.status}`);
  console.log(`Course access until: ${activated.endDate?.toISOString?.() || activated.endDate}`);
  console.log(`Progress record: ${progress ? "yes" : "MISSING — check logs"}`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error("Recovery failed:", err.message);
  if (err.response?.data) console.error(err.response.data);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
