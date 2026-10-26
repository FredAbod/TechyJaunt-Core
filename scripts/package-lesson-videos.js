/**
 * Package lesson MP4s into HLS (480p/720p) plus a fast-start copy.
 *
 * Usage:
 *   node scripts/package-lesson-videos.js --limit 1
 *   node scripts/package-lesson-videos.js
 *   node scripts/package-lesson-videos.js --lesson <lessonId>
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "../src/database/db.js";
import {
  enqueueLessonsMissingHls,
  packageLessonById,
  packageNextPendingLesson,
  prepareVideoBucket,
  releaseStalePackaging,
} from "../src/resources/courses/services/videoPackaging.service.js";

const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const lessonIdx = args.indexOf("--lesson");
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;
const LESSON_ID = lessonIdx >= 0 ? args[lessonIdx + 1] : null;

async function run() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGO_URI is not set");
    process.exit(1);
  }

  await connectDB(mongoUri);

  try {
    await prepareVideoBucket();
    console.log("S3 video CORS updated");
  } catch (error) {
    console.warn(`Could not update S3 CORS: ${error.message}`);
  }

  if (LESSON_ID) {
    const lesson = await packageLessonById(LESSON_ID);
    console.log(
      JSON.stringify(
        {
          lessonId: String(lesson._id),
          videoUrl: lesson.content.videoUrl,
          hlsUrl: lesson.content.hlsUrl,
          videoStatus: lesson.content.videoStatus,
        },
        null,
        2,
      ),
    );
    await mongoose.disconnect();
    return;
  }

  await releaseStalePackaging(0);
  const queued = await enqueueLessonsMissingHls();
  console.log(`Queued ${queued} lesson(s) missing HLS`);

  let done = 0;
  let failed = 0;
  while (done + failed < LIMIT) {
    const result = await packageNextPendingLesson();
    if (!result?.id) break;
    if (result.ok) {
      done += 1;
      console.log(`Packaged ${done}: ${result.id}`);
    } else {
      failed += 1;
      console.error(`Failed ${failed}: ${result.id}`);
    }
  }

  console.log(`Finished. Packaged ${done} lesson(s), failed ${failed}.`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
