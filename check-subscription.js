import mongoose from "mongoose";
import dotenv from "dotenv";
import Subscription from "./src/resources/payments/models/subscription.js";

dotenv.config();

const userId = "685ec527584981004042f25e";
const courseId = "68561f125f6bb4ec70d664c9";

async function checkSubscription() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    console.log("Searching for subscription with:");
    console.log("  User ID:", userId);
    console.log("  Course ID:", courseId);
    console.log("\n");

    // Check all subscriptions for this user and course
    const allSubscriptions = await Subscription.find({
      user: userId,
      courseId: courseId
    });

    console.log(`Found ${allSubscriptions.length} subscription(s):\n`);

    allSubscriptions.forEach((sub, index) => {
      console.log(`Subscription ${index + 1}:`);
      console.log("  ID:", sub._id);
      console.log("  Status:", sub.status);
      console.log("  Plan Type:", sub.planType);
      console.log("  Feature Access:", JSON.stringify(sub.featureAccess, null, 2));
      console.log("  Start Date:", sub.startDate);
      console.log("  End Date:", sub.endDate);
      console.log("");
    });

    // Check specifically for active subscription with certificate access
    const activeWithCert = await Subscription.findOne({
      user: userId,
      courseId,
      status: 'active',
      'featureAccess.certificate.hasAccess': true
    });

    console.log("=".repeat(50));
    if (activeWithCert) {
      console.log("✅ FOUND: Active subscription with certificate access");
    } else {
      console.log("❌ NOT FOUND: Active subscription with certificate access");
      console.log("\nLet me check what's missing:");
      
      const activeAny = await Subscription.findOne({
        user: userId,
        courseId,
        status: 'active'
      });

      if (!activeAny) {
        console.log("  ❌ No active subscription found");
      } else {
        console.log("  ✅ Active subscription exists");
        console.log("  Checking certificate access:");
        console.log("    featureAccess exists:", !!activeAny.featureAccess);
        console.log("    certificate exists:", !!activeAny.featureAccess?.certificate);
        console.log("    hasAccess value:", activeAny.featureAccess?.certificate?.hasAccess);
      }
    }

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    process.exit();
  }
}

checkSubscription();
