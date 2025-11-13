import mongoose from "mongoose";
import dotenv from "dotenv";
import certificateService from "./src/resources/courses/services/certificate.service.js";

dotenv.config();

const userId = "685ec527584981004042f25e";
const courseId = "68561f125f6bb4ec70d664c9";

async function testEligibility() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    console.log("Testing certificate eligibility check...");
    console.log("User ID:", userId);
    console.log("Course ID:", courseId);
    console.log("\n" + "=".repeat(50) + "\n");

    // Test with string IDs (as they come from the API)
    console.log("Test 1: Using string IDs (as from API request)");
    const result1 = await certificateService.checkEligibility(userId, courseId);
    console.log("Result:", JSON.stringify(result1, null, 2));

    console.log("\n" + "=".repeat(50) + "\n");

    // Test with ObjectId
    console.log("Test 2: Using ObjectId");
    const result2 = await certificateService.checkEligibility(
      new mongoose.Types.ObjectId(userId),
      new mongoose.Types.ObjectId(courseId)
    );
    console.log("Result:", JSON.stringify(result2, null, 2));

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    process.exit();
  }
}

testEligibility();
