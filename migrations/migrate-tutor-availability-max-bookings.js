/**
 * Migration: fix tutor availability slots where maxBookings was defaulted to 1
 * (Joi validation previously used .default(1)) and should be 5.
 *
 * Only updates slots with maxBookings === 1. Slots with any other value are left unchanged.
 *
 * Usage:
 *   npm run migrate:max-bookings
 *   npm run migrate:max-bookings -- --dry-run
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "../src/database/db.js";
import TutorAvailability from "../src/resources/bookings/models/tutorAvailability.js";

const DRY_RUN = process.argv.includes("--dry-run");
const TARGET_MAX_BOOKINGS = 5;
const OLD_MAX_BOOKINGS = 1;

async function run() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGO_URI (or MONGODB_URI) is not set");
    process.exit(1);
  }

  console.log("Tutor availability maxBookings migration");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log(`Updating timeSlots where maxBookings === ${OLD_MAX_BOOKINGS} → ${TARGET_MAX_BOOKINGS}\n`);

  await connectDB(mongoUri);

  const matchQuery = {
    timeSlots: { $elemMatch: { maxBookings: OLD_MAX_BOOKINGS } },
  };

  const affectedDocs = await TutorAvailability.find(matchQuery).select(
    "tutorId dayOfWeek specificDate timeSlots",
  );

  let slotsToUpdate = 0;
  for (const doc of affectedDocs) {
    for (const slot of doc.timeSlots) {
      if (slot.maxBookings === OLD_MAX_BOOKINGS) {
        slotsToUpdate += 1;
      }
    }
  }

  console.log(`Documents with at least one slot at maxBookings=${OLD_MAX_BOOKINGS}: ${affectedDocs.length}`);
  console.log(`Time slots to update: ${slotsToUpdate}`);

  if (slotsToUpdate === 0) {
    console.log("\nNothing to migrate.");
    await mongoose.disconnect();
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log("\nDry run complete. Re-run without --dry-run to apply changes.");
    await mongoose.disconnect();
    process.exit(0);
  }

  const result = await TutorAvailability.updateMany(matchQuery, {
    $set: { "timeSlots.$[slot].maxBookings": TARGET_MAX_BOOKINGS },
  }, {
    arrayFilters: [{ "slot.maxBookings": OLD_MAX_BOOKINGS }],
  });

  console.log("\nMigration applied:");
  console.log(`  matchedCount:  ${result.matchedCount}`);
  console.log(`  modifiedCount: ${result.modifiedCount}`);

  const remaining = await TutorAvailability.countDocuments(matchQuery);
  if (remaining > 0) {
    console.warn(
      `\nWarning: ${remaining} document(s) still have slots with maxBookings=${OLD_MAX_BOOKINGS}. Review manually.`,
    );
  } else {
    console.log("\nAll targeted slots updated successfully.");
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error("Migration failed:", err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
