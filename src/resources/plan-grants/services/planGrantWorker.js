import crypto from "crypto";
import os from "os";
import cron from "node-cron";
import PlanGrantJob from "../models/planGrantJob.js";
import PlanGrantService from "./planGrant.service.js";
import logger from "../../../utils/log/logger.js";
import { JOB_STATUS, PLAN_GRANT_LIMITS } from "../planGrant.constants.js";

/**
 * In-process worker for plan grant jobs, using MongoDB as the queue.
 *
 * - Jobs are claimed with an atomic findOneAndUpdate + lease, so multiple app
 *   instances can run this safely; only the lease holder processes a job.
 * - The lease is renewed after every batch. If the process dies, the lease
 *   expires and the cron sweep picks the job back up (items are idempotent).
 * - A job claimed too many times is assumed to be crashing the worker and is
 *   marked failed instead of looping forever.
 *
 * To move to a dedicated queue (e.g. BullMQ) later, replace this file; the
 * service's processNextBatch/finalizeJob contract stays the same.
 */
class PlanGrantWorker {
  constructor() {
    this.instanceId = `${os.hostname()}:${process.pid}:${crypto
      .randomBytes(4)
      .toString("hex")}`;
    this.draining = false;
  }

  /** Start processing soon without blocking the caller (e.g. right after enqueue). */
  kick() {
    setImmediate(() => {
      this.drain().catch((error) =>
        logger.error(`[PlanGrantWorker] drain error: ${error.message}`),
      );
    });
  }

  async drain() {
    if (this.draining) return;
    this.draining = true;
    try {
      let job;
      while ((job = await this.claimNextJob())) {
        await this.runJob(job);
      }
    } finally {
      this.draining = false;
    }
  }

  async claimNextJob() {
    const now = new Date();
    const job = await PlanGrantJob.findOneAndUpdate(
      {
        $or: [
          { status: JOB_STATUS.QUEUED },
          { status: JOB_STATUS.PROCESSING, leaseExpiresAt: { $lt: now } },
        ],
      },
      {
        $set: {
          status: JOB_STATUS.PROCESSING,
          leaseOwner: this.instanceId,
          leaseExpiresAt: new Date(now.getTime() + PLAN_GRANT_LIMITS.LEASE_MS),
        },
        $min: { startedAt: now },
        $inc: { claimCount: 1 },
      },
      { sort: { createdAt: 1 }, new: true },
    ).lean();

    if (job && job.claimCount > PLAN_GRANT_LIMITS.MAX_JOB_CLAIMS) {
      await PlanGrantJob.updateOne(
        { _id: job._id, leaseOwner: this.instanceId },
        {
          $set: {
            status: JOB_STATUS.FAILED,
            completedAt: new Date(),
            lastError: "Job exceeded maximum processing attempts",
          },
          $unset: { leaseOwner: 1, leaseExpiresAt: 1 },
        },
      );
      logger.error("[PlanGrantWorker] job abandoned after repeated claims", {
        jobId: job._id.toString(),
      });
      return this.claimNextJob();
    }

    return job;
  }

  /** @returns {boolean} false if another instance has taken the lease */
  async renewLease(jobId) {
    const result = await PlanGrantJob.updateOne(
      { _id: jobId, leaseOwner: this.instanceId },
      {
        $set: {
          leaseExpiresAt: new Date(Date.now() + PLAN_GRANT_LIMITS.LEASE_MS),
        },
      },
    );
    return result.matchedCount === 1;
  }

  async runJob(job) {
    const jobId = job._id.toString();
    logger.info("[PlanGrantWorker] processing job", {
      jobId,
      claim: job.claimCount,
    });

    try {
      while (await this.renewLease(job._id)) {
        const processed = await PlanGrantService.processNextBatch(job);
        if (processed === 0) {
          await PlanGrantService.finalizeJob(job, this.instanceId);
          return;
        }
      }
      logger.warn("[PlanGrantWorker] lost lease, stopping", { jobId });
    } catch (error) {
      // Leave the job in "processing". Once the lease lapses (LEASE_MS acts as
      // a backoff) the sweep retries it, up to MAX_JOB_CLAIMS times.
      logger.error(`[PlanGrantWorker] job ${jobId} errored: ${error.message}`);
      await PlanGrantJob.updateOne(
        { _id: job._id, leaseOwner: this.instanceId },
        { $set: { lastError: error.message } },
      ).catch(() => {});
    }
  }
}

const planGrantWorker = new PlanGrantWorker();

// Recovery sweep: picks up queued jobs and jobs whose worker died.
cron.schedule("* * * * *", () => {
  planGrantWorker.kick();
});

export default planGrantWorker;
