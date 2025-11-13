import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./src/resources/user/models/user.js";

dotenv.config();

const userId = "685ec527584981004042f25e";

async function generateToken() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get user details
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error("User not found!");
    }

    console.log("👤 Generating token for:");
    console.log("  User ID:", user._id.toString());
    console.log("  Email:", user.email);
    console.log("  Name:", user.firstName, user.lastName);
    console.log("  Role:", user.role);
    console.log("\n");

    // Create JWT payload (matching what the auth service would create)
    const payload = {
      _id: user._id.toString(),
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    };

    // Generate token
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "2day",
    });

    console.log("=".repeat(70));
    console.log("🎫 JWT TOKEN GENERATED:");
    console.log("=".repeat(70));
    console.log(token);
    console.log("=".repeat(70));
    
    console.log("\n📋 How to use this token:\n");
    console.log("1. Copy the token above");
    console.log("2. In your API client (Postman/Insomnia/Thunder Client), add header:");
    console.log("   Authorization: Bearer <paste_token_here>");
    console.log("\n3. Make your API request:");
    console.log("   GET /api/v1/certificates/courses/68561f125f6bb4ec70d664c9/eligibility");
    console.log("\n4. Or generate certificate:");
    console.log("   POST /api/v1/certificates/courses/68561f125f6bb4ec70d664c9/generate");
    
    console.log("\n⏰ Token expires in: 2 days");
    
    // Verify the token works
    console.log("\n✅ Token verification test:");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("  Decoded user ID:", decoded._id);
    console.log("  Decoded email:", decoded.email);
    console.log("  Token is valid! ✓");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    process.exit();
  }
}

generateToken();
