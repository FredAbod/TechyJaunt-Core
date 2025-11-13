import mongoose from "mongoose";
import dotenv from "dotenv";
import Progress from "./src/resources/courses/models/progress.js";

dotenv.config();

const userId = "685ec527584981004042f25e";
const courseId = "68561f125f6bb4ec70d664c9";

async function checkProgress() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const progress = await Progress.findOne({ userId, courseId });

    if (!progress) {
      console.log("❌ No progress record found!");
    } else {
      console.log("📊 Progress Record Found:\n");
      console.log("User ID:", progress.userId);
      console.log("Course ID:", progress.courseId);
      console.log("Subscription ID:", progress.subscriptionId);
      console.log("Overall Progress:", progress.overallProgress + "%");
      console.log("Is Completed:", progress.isCompleted);
      console.log("Completed At:", progress.completedAt);
      console.log("Total Modules:", progress.modules.length);
      console.log("\nModules Details:");
      
      progress.modules.forEach((module, index) => {
        console.log(`\n  Module ${index + 1}:`);
        console.log(`    Module ID: ${module.moduleId}`);
        console.log(`    Is Completed: ${module.isCompleted}`);
        console.log(`    Completed At: ${module.completedAt}`);
        console.log(`    Lessons: ${module.lessons.length}`);
        console.log(`    Assessments: ${module.assessmentAttempts.length}`);
        
        module.lessons.forEach((lesson, idx) => {
          console.log(`      Lesson ${idx + 1}: ${lesson.isCompleted ? '✅' : '❌'} ${lesson.lessonId}`);
        });
        
        module.assessmentAttempts.forEach((attempt, idx) => {
          console.log(`      Assessment ${idx + 1}: ${attempt.passed ? '✅ PASSED' : '❌ FAILED'} (Score: ${attempt.score}%)`);
        });
      });

      console.log("\n" + "=".repeat(50));
      console.log("ELIGIBILITY CHECK:");
      console.log("=".repeat(50));
      console.log("✓ isCompleted field:", progress.isCompleted ? "✅ TRUE" : "❌ FALSE");
      console.log("✓ completedAt field:", progress.completedAt ? `✅ ${progress.completedAt}` : "❌ NULL");
      console.log("✓ overallProgress:", progress.overallProgress + "%");
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

checkProgress();
