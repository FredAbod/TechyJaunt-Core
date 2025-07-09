import mongoose from "mongoose";
import SubscriptionPlan from "../src/resources/payments/models/subscriptionPlan.js";
import connectDB from "../src/database/db.js";
import logger from "../src/utils/log/logger.js";

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
      { 
        feature: "Self-paced course with lifetime access", 
        duration: "lifetime", 
        included: true 
      },
      { 
        feature: "Certificate upon course completion", 
        duration: "lifetime", 
        included: true 
      },
      { 
        feature: "AI Tutor", 
        duration: "1-month", 
        included: true 
      },
      { 
        feature: "Access to premium learning resources", 
        duration: "lifetime", 
        included: true 
      },
      { 
        feature: "LinkedIn optimization Ebook", 
        duration: "lifetime", 
        included: true 
      },
      { 
        feature: "Networking opportunities", 
        duration: "lifetime", 
        included: true 
      },
      { 
        feature: "Access to our alumni community", 
        duration: "lifetime", 
        included: true 
      }
    ],
    metadata: {
      popular: false,
      recommended: false,
      lifetimeAccess: true
    }
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
      { 
        feature: "AI Tutor", 
        duration: "1-month", 
        included: true 
      },
      { 
        feature: "Weekly one-on-one consultation with a mentor", 
        duration: "1-month", 
        included: true,
        limit: 4 // 4 sessions per month
      },
      { 
        feature: "Access to our alumni community", 
        duration: "1-month", 
        included: true 
      },
      { 
        feature: "LinkedIn optimization Ebook", 
        duration: "lifetime", 
        included: true 
      },
      { 
        feature: "Networking opportunities", 
        duration: "1-month", 
        included: true 
      }
    ],
    metadata: {
      popular: true,
      recommended: false,
      lifetimeAccess: false
    }
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
      { 
        feature: "Self-paced course with lifetime access", 
        duration: "lifetime", 
        included: true 
      },
      { 
        feature: "AI Tutor", 
        duration: "1-month", 
        included: true 
      },
      { 
        feature: "Certificate upon course completion", 
        duration: "lifetime", 
        included: true 
      },
      { 
        feature: "Weekly one-on-one consultation with a mentor", 
        duration: "1-month", 
        included: true,
        limit: 4 // 4 sessions per month
      },
      { 
        feature: "Access to premium learning resources", 
        duration: "lifetime", 
        included: true 
      },
      { 
        feature: "Access to our alumni community", 
        duration: "1-month", 
        included: true 
      },
      { 
        feature: "LinkedIn optimization Ebook", 
        duration: "lifetime", 
        included: true 
      },
      { 
        feature: "Networking opportunities", 
        duration: "1-month", 
        included: true 
      }
    ],
    metadata: {
      popular: false,
      recommended: true,
      lifetimeAccess: true
    }
  }
];

async function seedSubscriptionPlans() {
  try {
    console.log("🌱 Starting subscription plans seeding...");
    
    // Connect to database
    await connectDB(process.env.MONGO_URI);
    
    // Clear existing plans
    const deletedCount = await SubscriptionPlan.deleteMany({});
    console.log(`🗑️  Cleared ${deletedCount.deletedCount} existing subscription plans`);
    
    // Insert new plans
    const insertedPlans = await SubscriptionPlan.insertMany(subscriptionPlansData);
    console.log(`✅ Successfully seeded ${insertedPlans.length} subscription plans:`);
    
    insertedPlans.forEach(plan => {
      console.log(`   - ${plan.name} (${plan.planType}): ${plan.formattedPrice} ${plan.billing}`);
    });
    
    // Verify the seeded data
    const activePlans = await SubscriptionPlan.getActivePlans();
    console.log(`\n📊 Total active plans in database: ${activePlans.length}`);
    
    console.log("\n🎉 Subscription plans seeding completed successfully!");
    
  } catch (error) {
    console.error("❌ Error seeding subscription plans:", error.message);
    logger.error(`Subscription plans seeding error: ${error.message}`);
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

// Run seeder if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedSubscriptionPlans();
}

export { seedSubscriptionPlans, subscriptionPlansData };
