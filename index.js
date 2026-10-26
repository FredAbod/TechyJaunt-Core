import app from "./app.js";
import dotenv from "dotenv";
import logger from "./src/utils/log/logger.js";
import connectDB from "./src/database/db.js"
import PlanGrantItem from "./src/resources/plan-grants/models/planGrantItem.js";
import { sendServerFailure } from "./src/utils/email/email-sender.js";
// Start background schedulers
import './src/resources/bookings/services/reminderScheduler.js';
import './src/resources/payments/services/subscriptionReconciliationScheduler.js';
import './src/resources/plan-grants/services/planGrantWorker.js';
import './src/resources/courses/services/videoPackagingScheduler.js';


const port = process.env.PORT || 4000;
dotenv.config();

const server = app.listen(port, async () => {
  try {
    await connectDB(process.env.MONGO_URI)
    console.log(`Database connected successfully`)
    // One-off cleanup of an index replaced by per-course rows (no-op once gone)
    if (await PlanGrantItem.dropLegacyIndexes()) {
      logger.info("Dropped legacy plan grant item index job_1_email_1");
    }
    logger.info(`Server is running on port ${port}`);
  } catch (error) {
    logger.error(error);
  }
});
