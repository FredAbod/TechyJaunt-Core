import mongoose from "mongoose";
import dotenv from "dotenv";
import Progress from "./src/resources/courses/models/progress.js";
import Course from "./src/resources/courses/models/course.js";
import User from "./src/resources/user/models/user.js";
import Subscription from "./src/resources/payments/models/subscription.js";

dotenv.config();

const userId = "685ec527584981004042f25e";
const courseId = "68561f125f6bb4ec70d664c9";

async function completeCourseForUser() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Verify user exists
    console.log("👤 Checking user...");
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    console.log(`✅ User found: ${user.firstName} ${user.lastName} (${user.email})\n`);

    // Verify course exists
    console.log("📚 Checking course...");
    const course = await Course.findById(courseId);
    if (!course) {
      throw new Error(`Course with ID ${courseId} not found`);
    }
    console.log(`✅ Course found: ${course.title}`);
    console.log(`   Total modules: ${course.modules.length}\n`);

    // Check for existing progress
    console.log("📊 Checking for existing progress...");
    let progress = await Progress.findOne({ userId, courseId });

    if (!progress) {
      console.log("❌ No progress record found. Creating one...\n");

      // Check for active subscription
      const subscription = await Subscription.findOne({
        user: userId,
        courseId: courseId,
        status: "active"
      });

      if (!subscription) {
        console.log("⚠️  Warning: No active subscription found. You may need to create one first.");
        console.log("   Attempting to continue anyway...\n");
      }

      // Create progress record
      progress = new Progress({
        userId,
        courseId,
        subscriptionId: subscription?._id || new mongoose.Types.ObjectId(),
        modules: [],
        currentModuleIndex: 0,
        overallProgress: 0,
        totalWatchTime: 0,
        isCompleted: false,
        lastActivityAt: new Date()
      });
    } else {
      console.log(`✅ Progress record found (${progress.overallProgress}% complete)\n`);
    }

    // Complete all modules
    console.log("🎯 Marking all modules as completed...\n");

    for (let i = 0; i < course.modules.length; i++) {
      const moduleId = course.modules[i];
      console.log(`   Module ${i + 1}: ${moduleId}`);

      // Find or create module progress
      let moduleProgress = progress.modules.find(
        m => m.moduleId.toString() === moduleId.toString()
      );

      if (!moduleProgress) {
        moduleProgress = {
          moduleId: moduleId,
          lessons: [],
          assessmentAttempts: [],
          isCompleted: false,
          unlockedAt: new Date()
        };
        progress.modules.push(moduleProgress);
      }

      // Create dummy lesson progress (assuming 5 lessons per module)
      const numLessons = 5;
      console.log(`      Creating ${numLessons} completed lessons`);

      for (let j = 0; j < numLessons; j++) {
        const dummyLessonId = new mongoose.Types.ObjectId();
        const duration = 300 + (j * 60); // 5-9 minutes per lesson

        let lessonProgress = moduleProgress.lessons.find(
          l => l.lessonId.toString() === dummyLessonId.toString()
        );

        if (!lessonProgress) {
          lessonProgress = {
            lessonId: dummyLessonId,
            watchTime: duration,
            totalDuration: duration,
            isCompleted: true,
            completedAt: new Date(),
            lastWatchedAt: new Date()
          };
          moduleProgress.lessons.push(lessonProgress);
        }
      }

      // Add a passing assessment attempt
      console.log(`      Adding passing assessment`);
      const dummyAssessmentId = new mongoose.Types.ObjectId();

      moduleProgress.assessmentAttempts.push({
        assessmentId: dummyAssessmentId,
        score: 95,
        passed: true,
        attemptedAt: new Date(),
        answers: []
      });

      // Mark module as completed
      moduleProgress.isCompleted = true;
      moduleProgress.completedAt = new Date();

      console.log(`   ✅ Module ${i + 1} completed\n`);
    }

    // Update progress metadata
    progress.currentModuleIndex = course.modules.length - 1;
    progress.overallProgress = 100;
    progress.isCompleted = true;
    progress.completedAt = new Date();
    progress.lastActivityAt = new Date();

    // Calculate total watch time (sum of all lesson durations)
    let totalWatchTime = 0;
    progress.modules.forEach(module => {
      module.lessons.forEach(lesson => {
        totalWatchTime += lesson.watchTime || 0;
      });
    });
    progress.totalWatchTime = totalWatchTime;

    // Save the progress
    console.log("💾 Saving progress...");
    await progress.save();

    console.log("\n✨ SUCCESS! Course completed for user.\n");
    console.log("📊 Final Statistics:");
    console.log(`   Overall Progress: ${progress.overallProgress}%`);
    console.log(`   Modules Completed: ${progress.modules.length}`);
    console.log(`   Total Watch Time: ${Math.round(totalWatchTime / 60)} minutes`);
    console.log(`   Completion Date: ${progress.completedAt.toLocaleString()}`);
    console.log(`   Course Completed: ${progress.isCompleted ? 'YES ✅' : 'NO ❌'}`);

    console.log("\n🎓 You can now test certificate generation with:");
    console.log(`   POST /api/v1/certificates/courses/${courseId}/generate`);
    console.log(`   Authorization: Bearer <user_token>\n`);

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit();
  }
}

// Run the script
completeCourseForUser();
