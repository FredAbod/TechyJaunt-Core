import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/resources/user/models/user.js";

dotenv.config();

const targetEmail = "fredrickboluwatife@gmail.com";

async function findUser() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    console.log(`Searching for user with email: ${targetEmail}\n`);
    
    const user = await User.findOne({ email: targetEmail });

    if (!user) {
      console.log("❌ User not found!");
    } else {
      console.log("✅ User Found!\n");
      console.log("User Details:");
      console.log("  ID:", user._id.toString());
      console.log("  Email:", user.email);
      console.log("  First Name:", user.firstName);
      console.log("  Last Name:", user.lastName);
      console.log("  Role:", user.role);
      console.log("  Is Verified:", user.isVerified);
      console.log("\n" + "=".repeat(50));
      console.log("IMPORTANT: Use this user ID in your API requests:");
      console.log(user._id.toString());
      console.log("=".repeat(50));
      
      // Also search by the ID we used in the script
      console.log("\n\nVerifying the ID we used in the script:");
      const scriptUserId = "685ec527584981004042f25e";
      const userById = await User.findById(scriptUserId);
      
      if (userById) {
        console.log("✅ Script user ID is correct!");
        console.log("  Email:", userById.email);
        console.log("  Name:", userById.firstName, userById.lastName);
        
        if (userById.email === targetEmail) {
          console.log("\n✅ MATCH! The user IDs are for the same person.");
        } else {
          console.log("\n❌ MISMATCH! Different users!");
          console.log("  Script completed course for:", userById.email);
          console.log("  You're trying to test with:", targetEmail);
        }
      } else {
        console.log("❌ Script user ID not found in database!");
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

findUser();
