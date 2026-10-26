import cron from "node-cron";
import { VIDEO_PACKAGING_ENABLED } from "../../../utils/helper/config.js";
import logger from "../../../utils/log/logger.js";
import {
  packageNextPendingLesson,
  releaseStalePackaging,
} from "./videoPackaging.service.js";

if (VIDEO_PACKAGING_ENABLED === "true") {
  let running = false;

  cron.schedule("*/2 * * * *", async () => {
    if (running) return;
    running = true;
    try {
      await releaseStalePackaging();
      const result = await packageNextPendingLesson();
      if (result?.ok) {
        logger.info("[VideoPackaging] packaged lesson", {
          lessonId: String(result.id),
        });
      }
    } catch (error) {
      logger.error(`[VideoPackaging] scheduler error: ${error.message}`);
    } finally {
      running = false;
    }
  });
}
