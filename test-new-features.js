import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Course from "./src/resources/courses/models/course.js";
import Subscription from "./src/resources/payments/models/subscription.js";
import User from "./src/resources/user/models/user.js";

const dbString = process.env.MONGO_URI || "mongodb://localhost:27017/techyjaunt";

async function testNewFeatures() {
  try {
    await mongoose.connect(dbString);
    console.log("Connected to database successfully");

    // 1. Test Course with Image Field
    console.log("\n=== Testing Course Creation with Image ===");
    
    const user = await User.findOne({ role: { $in: ["admin", "tutor", "super admin"] } });
    if (!user) {
      console.log("No admin/tutor user found for testing");
      return;
    }

    const testCourse = {
      title: "Test Course with Image",
      description: "This is a test course to verify the new image field functionality",
      shortDescription: "Test course for image functionality",
      category: "Web Development",
      level: "Beginner",
      duration: "4 weeks",
      price: 15000,
      image: "https://res.cloudinary.com/test/image/upload/v123456789/test-course.jpg",
      thumbnail: "https://res.cloudinary.com/test/image/upload/v123456789/test-thumb.jpg",
      prerequisites: ["Basic computer knowledge"],
      learningOutcomes: ["Learn new skills", "Build projects"],
      tags: ["test", "web development"],
      instructor: user._id
    };

    try {
      const course = new Course(testCourse);
      await course.save();
      console.log(`✅ Course created successfully with image: ${course.title}`);
      console.log(`   Image URL: ${course.image}`);
      console.log(`   Course ID: ${course._id}`);

      // Test brochure field
      course.brochure = {
        filename: "test-brochure.pdf",
        url: "https://res.cloudinary.com/test/raw/upload/v123456789/test-brochure.pdf",
        size: 1024000
      };
      await course.save();
      console.log(`✅ Brochure added to course: ${course.brochure.filename}`);

      // 2. Test Subscription with Course ID
      console.log("\n=== Testing Subscription with Course ID ===");
      
      const testSubscription = {
        user: user._id,
        courseId: course._id,
        plan: "bronze",
        planDetails: {
          name: "Bronze Plan",
          price: 1580000,
          currency: "NGN",
          billing: "one-time",
          features: []
        },
        amount: 1580000,
        currency: "NGN",
        paymentMethod: "card",
        transactionReference: `TEST_SUB_${Date.now()}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        status: "active",
        featureAccess: {}
      };

      const subscription = new Subscription(testSubscription);
      await subscription.save();
      await subscription.populate('courseId', 'title category level image');
      
      console.log(`✅ Subscription created successfully for course: ${subscription.courseId.title}`);
      console.log(`   Plan: ${subscription.plan}`);
      console.log(`   Course ID: ${subscription.courseId._id}`);
      console.log(`   Course Image: ${subscription.courseId.image}`);

      // 3. Test Querying Subscriptions with Course Info
      console.log("\n=== Testing Subscription Queries with Course Info ===");
      
      const userSubscriptions = await Subscription.find({ user: user._id })
        .populate('courseId', 'title category level image thumbnail')
        .sort({ createdAt: -1 });

      console.log(`✅ Found ${userSubscriptions.length} subscriptions for user`);
      userSubscriptions.forEach(sub => {
        console.log(`   - Plan: ${sub.plan} | Course: ${sub.courseId?.title || 'N/A'} | Status: ${sub.status}`);
      });

      // Cleanup test data
      await Course.findByIdAndDelete(course._id);
      await Subscription.findByIdAndDelete(subscription._id);
      console.log("\n✅ Test data cleaned up");

    } catch (error) {
      console.error(`❌ Error creating test course: ${error.message}`);
    }

    // 4. Test Validation
    console.log("\n=== Testing Validation ===");
    
    try {
      const invalidCourse = new Course({
        title: "Invalid Course",
        description: "Missing required image field",
        shortDescription: "Invalid course",
        category: "Web Development",
        level: "Beginner",
        duration: "4 weeks",
        price: 15000,
        // Missing image field - should fail validation
        prerequisites: [],
        learningOutcomes: ["Test"],
        instructor: user._id
      });
      
      await invalidCourse.save();
      console.log("❌ Validation failed - course saved without image");
    } catch (error) {
      console.log("✅ Validation working - course rejected without image field");
    }

  } catch (error) {
    console.error("Error:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from database");
  }
}

testNewFeatures();
