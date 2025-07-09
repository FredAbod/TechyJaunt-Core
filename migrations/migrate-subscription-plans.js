import dotenv from 'dotenv';
dotenv.config();

import mongoose from "mongoose";
import SubscriptionPlan from "../src/resources/payments/models/subscriptionPlan.js";
import connectDB from "../src/database/db.js";
import logger from "../src/utils/log/logger.js";

console.log("📋 Migration script started...");

/**
 * Migration script to ensure subscription plans are available in the database
 * This can be run safely multiple times - it will only add plans if they don't exist
 */

const subscriptionPlansData = [
  {
    planType: "bronze",
    name: "Bronze Plan",
    price: 1580000, // ₦15,800 in kobo
    currency: "NGN",
    billing: "one-time",
    description: "One-time payment with lifetime course access",
    sortOrder: 1,
    features: [
      { feature: "Self-paced course with lifetime access", duration: "lifetime", included: true },
      { feature: "Certificate upon course completion", duration: "lifetime", included: true },
      { feature: "AI Tutor", duration: "1-month", included: true },
      { feature: "Access to premium learning resources", duration: "lifetime", included: true },
      { feature: "LinkedIn optimization Ebook", duration: "lifetime", included: true },
      { feature: "Networking opportunities", duration: "lifetime", included: true },
      { feature: "Access to our alumni community", duration: "lifetime", included: true }
    ],
    metadata: { popular: false, recommended: false, lifetimeAccess: true }
  },
  {
    planType: "silver",
    name: "Silver Plan",
    price: 3000000, // ₦30,000 in kobo
    currency: "NGN",
    billing: "monthly",
    description: "Monthly subscription with mentorship and AI tutor",
    sortOrder: 2,
    features: [
      { feature: "AI Tutor", duration: "1-month", included: true },
      { feature: "Weekly one-on-one consultation with a mentor", duration: "1-month", included: true, limit: 4 },
      { feature: "Access to our alumni community", duration: "1-month", included: true },
      { feature: "LinkedIn optimization Ebook", duration: "lifetime", included: true },
      { feature: "Networking opportunities", duration: "1-month", included: true }
    ],
    metadata: { popular: true, recommended: false, lifetimeAccess: false }
  },
  {
    planType: "gold",
    name: "Gold Plan",
    price: 4080000, // ₦40,800 in kobo
    currency: "NGN",
    billing: "monthly",
    description: "Premium monthly subscription with full access",
    sortOrder: 3,
    features: [
      { feature: "Self-paced course with lifetime access", duration: "lifetime", included: true },
      { feature: "AI Tutor", duration: "1-month", included: true },
      { feature: "Certificate upon course completion", duration: "lifetime", included: true },
      { feature: "Weekly one-on-one consultation with a mentor", duration: "1-month", included: true, limit: 4 },
      { feature: "Access to premium learning resources", duration: "lifetime", included: true },
      { feature: "Access to our alumni community", duration: "1-month", included: true },
      { feature: "LinkedIn optimization Ebook", duration: "lifetime", included: true },
      { feature: "Networking opportunities", duration: "1-month", included: true }
    ],
    metadata: { popular: false, recommended: true, lifetimeAccess: true }
  }
];

async function migrateSubscriptionPlans() {
  try {
    console.log("🔄 Starting subscription plans migration...");
    console.log("Environment check - MONGO_URI exists:", !!process.env.MONGO_URI);
    
    // Connect to database
    console.log("Attempting database connection...");
    await connectDB(process.env.MONGO_URI);
    console.log("✅ Database connected successfully");
    
    let migrated = 0;
    let skipped = 0;
    
    for (const planData of subscriptionPlansData) {
      const existingPlan = await SubscriptionPlan.findOne({ planType: planData.planType });
      
      if (existingPlan) {
        console.log(`⏭️  Plan '${planData.name}' already exists, skipping...`);
        skipped++;
      } else {
        await SubscriptionPlan.create(planData);
        console.log(`✅ Created plan '${planData.name}'`);
        migrated++;
      }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`   - Plans created: ${migrated}`);
    console.log(`   - Plans skipped: ${skipped}`);
    console.log(`   - Total plans: ${migrated + skipped}`);
    
    // Verify the migration
    const totalPlans = await SubscriptionPlan.countDocuments({ isActive: true });
    console.log(`\n✅ Total active plans in database: ${totalPlans}`);
    
    console.log("\n🎉 Subscription plans migration completed successfully!");
    
  } catch (error) {
    console.error("❌ Error during migration:", error.message);
    logger.error(`Subscription plans migration error: ${error.message}`);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
    process.exit(0);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

// Run migration if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  migrateSubscriptionPlans();
}

export { migrateSubscriptionPlans };
