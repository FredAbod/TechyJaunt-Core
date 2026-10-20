import Joi from "joi";
import mongoose from "mongoose";
import PlanGrantJob from "../models/planGrantJob.js";
import PlanGrantItem from "../models/planGrantItem.js";
import User from "../../user/models/user.js";
import Course from "../../courses/models/course.js";
import Progress from "../../courses/models/progress.js";
import progressService from "../../courses/services/progress.service.js";
import Subscription from "../../payments/models/subscription.js";
import SubscriptionPlan from "../../payments/models/subscriptionPlan.js";
import CoursePayment from "../../payments/models/coursePayment.js";
import SubscriptionService from "../../payments/services/subscription.service.js";
import SenderService from "../../../utils/integrations/sender.service.js";
import AppError from "../../../utils/lib/appError.js";
import logger from "../../../utils/log/logger.js";
import { generateTemporaryPassword } from "../../../utils/helper/tempPassword.js";
import { hashPasswordOffThread } from "../../../utils/helper/hashPool.js";
import { normalizeCourseCode } from "../../../utils/helper/courseCode.js";
import { loginUrl } from "../../../utils/helper/frontendUrls.js";
import { sendPlanAccessGrantedEmail } from "../../../utils/email/email-sender.js";
import { evaluateEligibility } from "./grantEligibility.js";
import {
  ITEM_OUTCOME,
  ITEM_STATUS,
  JOB_STATUS,
  NOTIFICATION_STATUS,
  PLAN_GRANT_ADMIN_ROLES,
  PLAN_GRANT_LIMITS,
  PLAN_GRANT_SOURCE,
  TEMP_PASSWORD_BCRYPT_ROUNDS,
  TEMP_PASSWORD_TTL_DAYS,
  TERMINAL_JOB_STATUSES,
} from "../planGrant.constants.js";

const SUPPORTED_BILLING = ["one-time", "monthly"]; // Subscription.planDetails.billing enum
const DEFAULT_DURATION_MONTHS = { monthly: 1 };
const USER_FIELDS =
  "email firstName lastName role status password mustChangePassword provisioning";
const MAX_ERROR_DETAILS = 25;

const emailSchema = Joi.string().email({ tlds: { allow: false } }).max(254);

const isDuplicateKeyError = (error) => error?.code === 11000;

const keyOf = (userId, courseId) => `${userId}|${courseId}`;

const groupBy = (rows, keyFn) => {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
};

/** Run `fn` over `items` with at most `limit` in flight. */
const mapWithConcurrency = async (items, limit, fn) => {
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (cursor < items.length) {
        const current = items[cursor++];
        await fn(current);
      }
    },
  );
  await Promise.all(workers);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withRetry = async (fn, { attempts = 3, baseDelayMs = 500 } = {}) => {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastError;
};

/**
 * Spaces calls evenly so at most `perMinute` happen per minute in this process.
 * Shared by every concurrent sender.
 */
const createRateLimiter = (perMinute) => {
  const interval = 60_000 / perMinute;
  let nextSlot = 0;
  return async () => {
    const now = Date.now();
    const slot = Math.max(now, nextSlot);
    nextSlot = slot + interval;
    if (slot > now) await sleep(slot - now);
  };
};

const validationError = (message, details) => {
  const error = new AppError(message, 400);
  error.details = details.slice(0, MAX_ERROR_DETAILS);
  return error;
};

/** Error that asks the worker to retry a recipient later. */
class RetryableRecipientError extends Error {}

class PlanGrantService {
  constructor() {
    this.acquireEmailSlot = createRateLimiter(
      PLAN_GRANT_LIMITS.EMAILS_PER_MINUTE,
    );
  }

  // ==================== REQUEST PREPARATION ====================

  /**
   * Shared by preview and job creation: checks the admin and plan, resolves
   * every row's course and normalizes recipients. Unknown or archived courses
   * reject the whole request with row numbers; invalid emails become rows.
   */
  async prepareRequest(adminId, payload) {
    const admin = await this.assertAdmin(adminId);
    const plan = await this.resolvePlan(payload);
    const { rows, courses, submitted, duplicatesRemoved } =
      await this.resolveRecipients(payload);

    if (rows.length === 0) {
      throw new AppError("No recipients to process", 400);
    }

    return {
      admin,
      ...plan,
      rows,
      courses,
      submitted,
      duplicatesRemoved,
      notifyExistingUsers: payload.notifyExistingUsers !== false,
    };
  }

  async assertAdmin(adminId) {
    // Re-check against the DB: JWT role claims can be stale after a demotion.
    const admin = await User.findById(adminId).select("role status");
    if (
      !admin ||
      !PLAN_GRANT_ADMIN_ROLES.includes(admin.role) ||
      ["suspended", "inactive"].includes(admin.status)
    ) {
      throw new AppError("Access denied. Admin privileges required.", 403);
    }
    return admin;
  }

  async resolvePlan(payload) {
    const plan = await SubscriptionPlan.getPlanByType(payload.planType);
    if (!plan) {
      throw new AppError(
        `Plan "${payload.planType}" does not exist or is inactive`,
        400,
      );
    }
    if (!SUPPORTED_BILLING.includes(plan.billing)) {
      throw new AppError(
        `Plans billed "${plan.billing}" cannot be granted yet`,
        400,
      );
    }

    let durationMonths = null;
    if (plan.billing === "one-time") {
      if (payload.durationMonths) {
        throw new AppError(
          "durationMonths does not apply to one-time (lifetime) plans",
          400,
        );
      }
    } else {
      durationMonths =
        payload.durationMonths || DEFAULT_DURATION_MONTHS[plan.billing];
    }

    return {
      plan,
      durationMonths,
      planSnapshot: {
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        billing: plan.billing,
        features: plan.features,
      },
    };
  }

  /**
   * Resolve each row's course (courseCode, courseId, or the request default),
   * then trim/lowercase/dedupe by email + course and validate emails.
   */
  async resolveRecipients(payload) {
    const recipients = payload.recipients || [];
    const entries = recipients.map((raw, i) => {
      const entry = typeof raw === "string" ? { email: raw } : raw || {};
      return {
        row: i + 1,
        email: String(entry.email || "").trim().toLowerCase(),
        firstName: entry.firstName?.trim() || undefined,
        lastName: entry.lastName?.trim() || undefined,
        courseCode: entry.courseCode ? normalizeCourseCode(entry.courseCode) : null,
        courseId: entry.courseId || (entry.courseCode ? null : payload.courseId) || null,
      };
    });

    const codes = [...new Set(entries.map((e) => e.courseCode).filter(Boolean))];
    const ids = [...new Set(entries.map((e) => e.courseId).filter(Boolean))];
    const found = await Course.find({
      $or: [{ code: { $in: codes } }, { _id: { $in: ids } }],
    })
      .select("title code status")
      .lean();
    const byCode = new Map(found.filter((c) => c.code).map((c) => [c.code, c]));
    const byId = new Map(found.map((c) => [String(c._id), c]));

    const errors = [];
    for (const entry of entries) {
      const course = entry.courseCode
        ? byCode.get(entry.courseCode)
        : entry.courseId && byId.get(String(entry.courseId));

      if (!entry.courseCode && !entry.courseId) {
        errors.push({ row: entry.row, email: entry.email, message: "No course given" });
      } else if (!course) {
        errors.push({
          row: entry.row,
          email: entry.email,
          message: entry.courseCode
            ? `Unknown course code "${entry.courseCode}"`
            : "Course not found",
        });
      } else if (course.status === "archived") {
        errors.push({
          row: entry.row,
          email: entry.email,
          message: `Course "${course.title}" is archived`,
        });
      } else {
        entry.course = course;
      }
    }
    if (errors.length) {
      const distinct = [...new Set(errors.map((e) => e.message))];
      const message =
        distinct.length === 1
          ? `${distinct[0]}${errors.length > 1 ? ` (${errors.length} rows)` : ""}`
          : `${errors.length} rows reference a course that can't be granted. Fix them and try again.`;
      throw validationError(message, errors);
    }

    const seen = new Set();
    const rows = [];
    const courses = new Map();
    let duplicatesRemoved = 0;

    for (const entry of entries) {
      const courseId = String(entry.course._id);
      const key = `${entry.email}|${courseId}`;
      if (seen.has(key)) {
        duplicatesRemoved += 1;
        continue;
      }
      seen.add(key);

      const summary = courses.get(courseId) || {
        course: entry.course._id,
        title: entry.course.title,
        code: entry.course.code,
        total: 0,
      };
      summary.total += 1;
      courses.set(courseId, summary);

      const base = {
        index: rows.length,
        row: entry.row,
        email: entry.email,
        firstName: entry.firstName,
        lastName: entry.lastName,
        courseId: entry.course._id,
        courseTitle: entry.course.title,
        courseCode: entry.course.code,
      };

      if (emailSchema.validate(entry.email).error) {
        rows.push({
          ...base,
          // Keep something unique and displayable for blank/garbage input
          email: entry.email || `(blank row ${entry.row})`,
          status: ITEM_STATUS.FAILED,
          outcome: ITEM_OUTCOME.INVALID_EMAIL,
          reason: "Not a valid email address",
          notification: { status: NOTIFICATION_STATUS.NOT_REQUESTED },
          processedAt: new Date(),
        });
        continue;
      }
      rows.push(base);
    }

    return {
      rows,
      courses: [...courses.values()],
      submitted: recipients.length,
      duplicatesRemoved,
    };
  }

  // ==================== PREVIEW (DRY RUN) ====================

  /**
   * Predict every row's outcome with the same eligibility rules the worker
   * uses, without writing anything.
   */
  async previewJob({ adminId, payload }) {
    const prepared = await this.prepareRequest(adminId, payload);
    const { rows, planSnapshot, durationMonths, notifyExistingUsers } = prepared;

    const valid = rows.filter((row) => row.status !== ITEM_STATUS.FAILED);
    const users = await User.find({
      email: { $in: [...new Set(valid.map((row) => row.email))] },
    })
      .select(USER_FIELDS)
      .lean();
    const usersByEmail = new Map(users.map((user) => [user.email, user]));
    const state = await this.loadCourseState(
      users.map((user) => user._id),
      [...new Set(valid.map((row) => String(row.courseId)))],
    );

    const predicted = rows.map((row) => {
      const result = {
        row: row.row,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        courseId: row.courseId,
        courseTitle: row.courseTitle,
        courseCode: row.courseCode,
      };
      if (row.status === ITEM_STATUS.FAILED) {
        return { ...result, outcome: row.outcome, reason: row.reason };
      }

      const user = usersByEmail.get(row.email);
      if (!user) return { ...result, outcome: ITEM_OUTCOME.GRANTED_NEW_ACCOUNT };

      const ineligible = this.checkEligibility(
        this.previewContext(prepared),
        user,
        row.courseId,
        state,
      );
      if (ineligible) return { ...result, ...ineligible };

      return {
        ...result,
        outcome: user.password
          ? ITEM_OUTCOME.GRANTED_EXISTING_ACCOUNT
          : ITEM_OUTCOME.GRANTED_ACTIVATED_ACCOUNT,
      };
    });

    return {
      plan: { type: prepared.plan.planType, ...planSnapshot, durationMonths },
      summary: this.summarizePreview(predicted, prepared, notifyExistingUsers),
      rows: predicted,
    };
  }

  summarizePreview(predicted, prepared, notifyExistingUsers) {
    const byOutcome = {};
    const byCourse = new Map(
      prepared.courses.map((c) => [
        String(c.course),
        { courseId: c.course, title: c.title, code: c.code, total: c.total, byOutcome: {} },
      ]),
    );
    const newAccounts = new Set();
    const emailRecipients = new Set();

    for (const row of predicted) {
      byOutcome[row.outcome] = (byOutcome[row.outcome] || 0) + 1;
      const course = byCourse.get(String(row.courseId));
      course.byOutcome[row.outcome] = (course.byOutcome[row.outcome] || 0) + 1;

      if (!row.outcome.startsWith("GRANTED_")) continue;
      const credentials = row.outcome !== ITEM_OUTCOME.GRANTED_EXISTING_ACCOUNT;
      if (credentials) newAccounts.add(row.email);
      if (credentials || notifyExistingUsers) emailRecipients.add(row.email);
    }

    const toGrant = predicted.filter((row) => row.outcome.startsWith("GRANTED_")).length;
    return {
      submitted: prepared.submitted,
      duplicatesRemoved: prepared.duplicatesRemoved,
      rows: predicted.length,
      people: new Set(predicted.map((row) => row.email)).size,
      toGrant,
      newAccounts: newAccounts.size,
      emailsToSend: emailRecipients.size,
      byOutcome,
      byCourse: [...byCourse.values()],
    };
  }

  // ==================== JOB CREATION ====================

  /**
   * Validate the request, snapshot the plan and enqueue one item per row.
   * Returns quickly; the worker does the actual granting.
   */
  async createJob({ adminId, payload, idempotencyKey }) {
    const admin = await this.assertAdmin(adminId);

    if (idempotencyKey) {
      const existing = await PlanGrantJob.findOne({
        createdBy: admin._id,
        idempotencyKey,
      });
      if (existing) return { job: existing, reused: true };
    }

    const prepared = await this.prepareRequest(adminId, payload);
    const { rows, courses } = prepared;
    const invalid = rows.filter((row) => row.status === ITEM_STATUS.FAILED);
    const single = courses.length === 1 ? courses[0] : null;

    // Build the job in memory and insert items first, so the worker can never
    // claim a job whose items haven't been written yet.
    const job = new PlanGrantJob({
      createdBy: admin._id,
      idempotencyKey: idempotencyKey || undefined,
      planType: prepared.plan.planType,
      planSnapshot: prepared.planSnapshot,
      courseId: single?.course,
      courseTitle: single?.title,
      courses,
      durationMonths: prepared.durationMonths,
      notifyExistingUsers: prepared.notifyExistingUsers,
      note: payload.note,
      status: JOB_STATUS.QUEUED,
      totals: {
        submitted: prepared.submitted,
        duplicatesRemoved: prepared.duplicatesRemoved,
        total: rows.length,
        failed: invalid.length,
        pending: rows.length - invalid.length,
      },
    });

    await PlanGrantItem.insertMany(
      rows.map(({ row, ...item }) => ({ ...item, job: job._id })),
      { ordered: false },
    );

    try {
      await job.save();
    } catch (error) {
      await PlanGrantItem.deleteMany({ job: job._id });
      // Concurrent request with the same idempotency key won the race
      if (isDuplicateKeyError(error) && idempotencyKey) {
        const existing = await PlanGrantJob.findOne({
          createdBy: admin._id,
          idempotencyKey,
        });
        if (existing) return { job: existing, reused: true };
      }
      throw error;
    }

    logger.info("Plan grant job queued", {
      jobId: job._id.toString(),
      adminId: admin._id.toString(),
      planType: job.planType,
      courses: courses.length,
      total: rows.length,
    });

    return { job, reused: false };
  }

  // ==================== CANCEL ====================

  /**
   * Stop a queued or running job. Rows not yet started are marked cancelled;
   * rows already being processed may still complete. Grants are not undone.
   */
  async cancelJob({ adminId, jobId }) {
    const admin = await this.assertAdmin(adminId);

    const job = await PlanGrantJob.findOneAndUpdate(
      {
        _id: jobId,
        status: { $in: [JOB_STATUS.QUEUED, JOB_STATUS.PROCESSING] },
      },
      { $set: { cancelRequestedAt: new Date(), cancelledBy: admin._id } },
      { new: true },
    );
    if (!job) {
      const exists = await PlanGrantJob.exists({ _id: jobId });
      if (!exists) throw new AppError("Plan grant job not found", 404);
      throw new AppError("This job has already finished", 409);
    }

    const { modifiedCount } = await PlanGrantItem.updateMany(
      { job: job._id, status: ITEM_STATUS.PENDING },
      {
        $set: {
          status: ITEM_STATUS.CANCELLED,
          outcome: ITEM_OUTCOME.CANCELLED,
          reason: "Cancelled by an admin before processing",
          "notification.status": NOTIFICATION_STATUS.NOT_REQUESTED,
          processedAt: new Date(),
        },
      },
    );

    // Nobody is working on a queued job, so close it now; a running job is
    // closed by its worker after the current batch.
    if (job.status === JOB_STATUS.QUEUED) {
      const totals = await this.computeTotals(job._id);
      await PlanGrantJob.updateOne(
        { _id: job._id, status: JOB_STATUS.QUEUED },
        {
          $set: {
            status: JOB_STATUS.CANCELLED,
            completedAt: new Date(),
            ...this.totalsUpdate(totals),
          },
        },
      );
    }

    logger.info("Plan grant job cancelled", {
      jobId: job._id.toString(),
      adminId: admin._id.toString(),
      rowsCancelled: modifiedCount,
    });

    return { job: await this.getJob(job._id), rowsCancelled: modifiedCount };
  }

  // ==================== QUERIES ====================

  /** Every grantable course with its code, for the CSV template and pickers. */
  async listCourses() {
    return Course.find({ status: { $ne: "archived" }, isActive: { $ne: false } })
      .select("title code status")
      .sort({ title: 1 })
      .lean();
  }

  async listJobs({ page = 1, limit = 20, status } = {}) {
    const filter = status ? { status } : {};
    const [jobs, total] = await Promise.all([
      PlanGrantJob.find(filter)
        .select("-leaseOwner -leaseExpiresAt -idempotencyKey")
        .populate("createdBy", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PlanGrantJob.countDocuments(filter),
    ]);

    return {
      jobs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getJob(jobId) {
    const job = await PlanGrantJob.findById(jobId)
      .select("-leaseOwner -leaseExpiresAt -idempotencyKey")
      .populate("createdBy", "firstName lastName email")
      .populate("cancelledBy", "firstName lastName email")
      .lean();
    if (!job) throw new AppError("Plan grant job not found", 404);

    // Totals are only snapshotted on completion; compute live while running
    if (!TERMINAL_JOB_STATUSES.includes(job.status)) {
      job.totals = { ...job.totals, ...(await this.computeTotals(job._id)) };
    }
    const [outcomes, byCourse] = await Promise.all([
      this.computeOutcomeBreakdown(job._id),
      this.computeCourseBreakdown(job),
    ]);
    job.outcomes = outcomes;
    job.byCourse = byCourse;
    return job;
  }

  async listItems(jobId, { page = 1, limit = 50, status, outcome, courseId, search } = {}) {
    const exists = await PlanGrantJob.exists({ _id: jobId });
    if (!exists) throw new AppError("Plan grant job not found", 404);

    const filter = { job: jobId };
    if (status) filter.status = status;
    if (outcome) filter.outcome = outcome;
    if (courseId) filter.courseId = courseId;
    if (search) {
      const escaped = search.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.email = { $regex: escaped };
    }

    const [items, total] = await Promise.all([
      PlanGrantItem.find(filter)
        .select("-job")
        .sort({ index: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PlanGrantItem.countDocuments(filter),
    ]);

    return {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async computeTotals(jobId) {
    const rows = await PlanGrantItem.aggregate([
      { $match: { job: new mongoose.Types.ObjectId(String(jobId)) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const totals = { granted: 0, skipped: 0, failed: 0, pending: 0, cancelled: 0 };
    rows.forEach((row) => {
      totals[row._id] = row.count;
    });
    return totals;
  }

  totalsUpdate(totals) {
    return Object.fromEntries(
      Object.entries(totals).map(([key, value]) => [`totals.${key}`, value]),
    );
  }

  async computeOutcomeBreakdown(jobId) {
    const rows = await PlanGrantItem.aggregate([
      {
        $match: {
          job: new mongoose.Types.ObjectId(String(jobId)),
          outcome: { $ne: null },
        },
      },
      { $group: { _id: "$outcome", count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(rows.map((row) => [row._id, row.count]));
  }

  async computeCourseBreakdown(job) {
    const rows = await PlanGrantItem.aggregate([
      { $match: { job: new mongoose.Types.ObjectId(String(job._id)) } },
      {
        $group: {
          _id: { course: { $ifNull: ["$courseId", job.courseId ?? null] }, status: "$status" },
          count: { $sum: 1 },
          title: { $first: "$courseTitle" },
          code: { $first: "$courseCode" },
        },
      },
    ]);

    const byCourse = new Map();
    for (const row of rows) {
      const id = String(row._id.course);
      const entry = byCourse.get(id) || {
        courseId: row._id.course,
        title: row.title || job.courseTitle,
        code: row.code,
        total: 0,
        granted: 0,
        skipped: 0,
        failed: 0,
        pending: 0,
        cancelled: 0,
      };
      entry[row._id.status] = row.count;
      entry.total += row.count;
      byCourse.set(id, entry);
    }
    return [...byCourse.values()].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  }

  // ==================== PROCESSING (called by the worker) ====================

  /**
   * Process the next batch of pending rows. All of a person's rows are
   * processed together so their account is created once and they get a
   * single email listing every course.
   * @returns {number} number of rows processed (0 when the job is drained)
   */
  async processNextBatch(job) {
    const seed = await PlanGrantItem.find({ job: job._id, status: ITEM_STATUS.PENDING })
      .sort({ index: 1 })
      .limit(PLAN_GRANT_LIMITS.BATCH_SIZE)
      .select("email")
      .lean();
    if (seed.length === 0) return 0;

    const emails = [...new Set(seed.map((item) => item.email))];
    // Every row for these people, including finished ones (needed to know
    // whether their credentials email already went out on an earlier pass)
    const items = await PlanGrantItem.find({ job: job._id, email: { $in: emails } }).lean();
    const pending = items.filter((item) => item.status === ITEM_STATUS.PENDING);

    const ctx = await this.loadBatchContext(job, emails, pending);
    const byEmail = groupBy(items, (item) => item.email);
    const groups = emails
      .map((email) => ({
        email,
        all: byEmail.get(email) || [],
        pending: (byEmail.get(email) || []).filter((i) => i.status === ITEM_STATUS.PENDING),
      }))
      .filter((group) => group.pending.length > 0);

    await mapWithConcurrency(groups, PLAN_GRANT_LIMITS.CONCURRENCY, (group) =>
      this.processRecipientSafely(job, group, ctx),
    );
    return pending.length;
  }

  async finalizeJob(job, owner) {
    // Re-read: a cancel may have arrived after this worker claimed the job
    const current = await PlanGrantJob.findById(job._id).select("cancelRequestedAt").lean();
    const totals = await this.computeTotals(job._id);
    let status = JOB_STATUS.COMPLETED;
    if (current?.cancelRequestedAt) status = JOB_STATUS.CANCELLED;
    else if (totals.failed > 0) status = JOB_STATUS.COMPLETED_WITH_ERRORS;

    await PlanGrantJob.updateOne(
      { _id: job._id, leaseOwner: owner },
      {
        $set: { status, completedAt: new Date(), ...this.totalsUpdate(totals) },
        $unset: { leaseOwner: 1, leaseExpiresAt: 1 },
      },
    );

    logger.info("Plan grant job finished", {
      jobId: job._id.toString(),
      status,
      ...totals,
    });
  }

  grantReference(jobId, itemId) {
    // Deterministic + unique index on transactionReference = idempotent grant
    return `TJ_GRANT_${jobId}_${itemId}`;
  }

  courseOf(job, item) {
    return item.courseId || job.courseId;
  }

  /** Prefetch everything a batch needs in a fixed number of queries (no N+1). */
  async loadBatchContext(job, emails, pending) {
    const refs = pending.map((item) => this.grantReference(job._id, item._id));

    const [users, grantSubs] = await Promise.all([
      User.find({ email: { $in: emails } }).select(USER_FIELDS).lean(),
      Subscription.find({ transactionReference: { $in: refs } })
        .select("_id transactionReference featureAccess endDate")
        .lean(),
    ]);

    const courseIds = [...new Set(pending.map((item) => String(this.courseOf(job, item))))];
    const courseState = await this.loadCourseState(
      users.map((user) => user._id),
      courseIds,
    );

    return {
      usersByEmail: new Map(users.map((user) => [user.email, user])),
      grantSubsByRef: new Map(grantSubs.map((sub) => [sub.transactionReference, sub])),
      ...courseState,
    };
  }

  async loadCourseState(userIds, courseIds) {
    if (userIds.length === 0 || courseIds.length === 0) {
      return { subsByKey: new Map(), pendingPaymentsByKey: new Map() };
    }
    const [subs, pendingPayments] = await Promise.all([
      Subscription.find({
        user: { $in: userIds },
        courseId: { $in: courseIds },
        status: { $in: ["pending", "active", "expired"] },
      })
        .select("user courseId plan status endDate transactionReference")
        .lean(),
      CoursePayment.find({
        user: { $in: userIds },
        course: { $in: courseIds },
        status: "pending",
      })
        .select("user course transactionReference")
        .lean(),
    ]);
    return {
      subsByKey: groupBy(subs, (sub) => keyOf(sub.user, sub.courseId)),
      pendingPaymentsByKey: groupBy(pendingPayments, (p) => keyOf(p.user, p.course)),
    };
  }

  // Preview runs eligibility before a job exists; give the checker the fields it reads
  previewContext(prepared) {
    return { _id: null, planType: prepared.plan.planType, planSnapshot: prepared.planSnapshot };
  }

  /** Eligibility for one person + course, ignoring grants made by this job. */
  checkEligibility(job, user, courseId, state) {
    const key = keyOf(user._id, courseId);
    const ownPrefix = job._id ? `TJ_GRANT_${job._id}_` : null;
    return evaluateEligibility({
      user,
      planType: job.planType,
      planBilling: job.planSnapshot.billing,
      subscriptions: (state.subsByKey.get(key) || []).filter(
        (sub) => !ownPrefix || !sub.transactionReference?.startsWith(ownPrefix),
      ),
      pendingCoursePayments: state.pendingPaymentsByKey.get(key) || [],
    });
  }

  async processRecipientSafely(job, group, ctx) {
    const attempts = Math.max(...group.pending.map((item) => item.attempts || 0));
    const isLastAttempt = attempts + 1 >= PLAN_GRANT_LIMITS.MAX_ITEM_ATTEMPTS;
    let results;

    try {
      results = await this.processRecipient(job, group, ctx, { isLastAttempt });
    } catch (error) {
      logger.error("Plan grant recipient failed", {
        jobId: job._id.toString(),
        email: group.email,
        attempt: attempts + 1,
        error: error.message,
      });
      results = new Map(
        group.pending.map((item) => [String(item._id), this.failureUpdate(error, isLastAttempt)]),
      );
    }

    const now = new Date();
    await PlanGrantItem.bulkWrite(
      group.pending.map((item) => {
        // Every pending row must leave this pass with a decision or a retry,
        // otherwise it would be picked up again forever
        const result =
          results.get(String(item._id)) ||
          this.failureUpdate(new Error("Row was not processed"), isLastAttempt);
        const { retry, lastError, ...fields } = result;
        return {
          updateOne: {
            filter: { _id: item._id },
            update: retry
              ? { $inc: { attempts: 1 }, $set: { lastError } }
              : {
                  $inc: { attempts: 1 },
                  $set: { ...fields, processedAt: now },
                  $unset: { lastError: 1 },
                },
          },
        };
      }),
      { ordered: false },
    );
  }

  failureUpdate(error, isLastAttempt) {
    if (!isLastAttempt) return { retry: true, lastError: error.message };
    return {
      status: ITEM_STATUS.FAILED,
      outcome: ITEM_OUTCOME.ERROR,
      reason: error.message,
    };
  }

  /**
   * Grant every pending course for one person. Safe to re-run after a crash:
   * - account creation is guarded by the unique email index
   * - each subscription uses a deterministic reference with a unique index
   * - accounts provisioned by this job are recognised via `provisioning.jobId`
   * @returns {Map<string, object>} update per item id
   */
  async processRecipient(job, group, ctx, { isLastAttempt }) {
    const { email, pending, all } = group;
    const first = pending[0];
    const results = new Map();
    let user = ctx.usersByEmail.get(email);
    let account = null; // { action, temporaryPassword? }
    let state = ctx;

    if (!user) {
      const created = await this.createProvisionedUser(job, first);
      if (created) {
        user = created.user;
        account = { action: "created", temporaryPassword: created.temporaryPassword };
      } else {
        // Lost a race with a concurrent sign-up: treat as an existing user
        user = await User.findOne({ email }).select(USER_FIELDS).lean();
        if (!user) throw new Error("User lookup failed after duplicate key");
        state = await this.loadCourseState(
          [user._id],
          pending.map((item) => this.courseOf(job, item)),
        );
      }
    } else if (this.isProvisionedByJob(user, job._id)) {
      // An earlier pass created or activated this account
      account = { action: user.provisioning.action || "created" };
    }

    // Decide per course
    const toGrant = [];
    for (const item of pending) {
      const courseId = this.courseOf(job, item);
      const reference = this.grantReference(job._id, item._id);
      const grantSub = ctx.grantSubsByRef.get(reference);

      if (!grantSub) {
        const ineligible = this.checkEligibility(job, user, courseId, state);
        if (ineligible) {
          results.set(String(item._id), {
            status: ITEM_STATUS.SKIPPED,
            ...ineligible,
            user: user._id,
            notification: { status: NOTIFICATION_STATUS.NOT_REQUESTED },
          });
          continue;
        }
      }
      toGrant.push({ item, courseId, reference, grantSub });
    }
    if (toGrant.length === 0) return results;

    if (!account) {
      // Started sign-up but never set a password: give them credentials
      const temporaryPassword = user.password
        ? null
        : await this.activateExistingUser(job, first, user);
      account = temporaryPassword
        ? { action: "activated", temporaryPassword }
        : { action: "existing" };
    }

    const granted = [];
    for (const entry of toGrant) {
      try {
        const sub =
          entry.grantSub ||
          (await this.createGrantSubscription(job, user._id, entry.courseId, entry.reference));
        await this.ensureCourseProgress(sub, user._id, entry.courseId);
        granted.push({ ...entry, sub });
      } catch (error) {
        logger.error("Plan grant row failed", {
          jobId: job._id.toString(),
          itemId: entry.item._id.toString(),
          error: error.message,
        });
        results.set(String(entry.item._id), this.failureUpdate(error, isLastAttempt));
      }
    }
    if (granted.length === 0) return results;

    // Retry of an account this job provisioned: the plaintext password was
    // never stored, so issue a fresh one only if no credentials email went out.
    const credentialsSent = all.some(
      (item) =>
        item.notification?.status === NOTIFICATION_STATUS.SENT &&
        item.notification?.withCredentials,
    );
    if (
      !account.temporaryPassword &&
      account.action !== "existing" &&
      user.mustChangePassword &&
      !credentialsSent
    ) {
      account.temporaryPassword = await this.reissueTemporaryPassword(user._id, job._id);
    }

    const notification = await this.notify(job, first, user, account, granted, {
      isLastAttempt,
    });

    const outcome = {
      created: ITEM_OUTCOME.GRANTED_NEW_ACCOUNT,
      activated: ITEM_OUTCOME.GRANTED_ACTIVATED_ACCOUNT,
      existing: ITEM_OUTCOME.GRANTED_EXISTING_ACCOUNT,
    }[account.action];
    const credentialsFailed =
      notification.status === NOTIFICATION_STATUS.FAILED && notification.withCredentials;

    for (const entry of granted) {
      results.set(String(entry.item._id), {
        status: ITEM_STATUS.GRANTED,
        outcome,
        reason: credentialsFailed
          ? "Access granted, but the credentials email failed. The user can use 'Forgot password' to sign in."
          : undefined,
        user: user._id,
        subscription: entry.sub._id,
        notification,
      });
    }
    return results;
  }

  isProvisionedByJob(user, jobId) {
    return (
      user.provisioning?.source === PLAN_GRANT_SOURCE &&
      String(user.provisioning?.jobId) === String(jobId)
    );
  }

  async issueTemporaryPassword() {
    const temporaryPassword = generateTemporaryPassword();
    // Off the event loop: a 2,000-account job would otherwise block the API for minutes
    const hash = await hashPasswordOffThread(temporaryPassword, TEMP_PASSWORD_BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + TEMP_PASSWORD_TTL_DAYS * 24 * 60 * 60 * 1000);
    return { temporaryPassword, hash, expiresAt };
  }

  provisioningFor(job, action) {
    return {
      source: PLAN_GRANT_SOURCE,
      action,
      jobId: job._id,
      provisionedBy: job.createdBy,
      provisionedAt: new Date(),
    };
  }

  /** @returns {null | { user, temporaryPassword }} null if the email already exists */
  async createProvisionedUser(job, item) {
    const { temporaryPassword, hash, expiresAt } = await this.issueTemporaryPassword();

    try {
      const doc = await User.create({
        email: item.email,
        firstName: item.firstName,
        lastName: item.lastName,
        password: hash,
        role: "user",
        status: "active",
        emailVerified: true,
        mustChangePassword: true,
        tempPasswordExpiresAt: expiresAt,
        provisioning: this.provisioningFor(job, "created"),
      });

      this.syncMailingList(doc);
      return { user: doc.toObject(), temporaryPassword };
    } catch (error) {
      if (isDuplicateKeyError(error)) return null;
      throw error;
    }
  }

  /**
   * Existing account that never finished sign-up (no password): verify it and
   * issue a temporary password. Conditional update so we never overwrite a
   * password the user set in the meantime.
   * @returns {string|null} temporary password, or null if a password now exists
   */
  async activateExistingUser(job, item, user) {
    const { temporaryPassword, hash, expiresAt } = await this.issueTemporaryPassword();

    const set = {
      password: hash,
      emailVerified: true,
      status: "active",
      mustChangePassword: true,
      tempPasswordExpiresAt: expiresAt,
      provisioning: this.provisioningFor(job, "activated"),
    };
    if (!user.firstName && item.firstName) set.firstName = item.firstName;
    if (!user.lastName && item.lastName) set.lastName = item.lastName;

    const updated = await User.findOneAndUpdate(
      { _id: user._id, $or: [{ password: null }, { password: "" }] },
      { $set: set, $unset: { emailOtp: 1, otpExpiresAt: 1 } },
      { new: true, projection: { _id: 1 } },
    );
    return updated ? temporaryPassword : null;
  }

  async reissueTemporaryPassword(userId, jobId) {
    const { temporaryPassword, hash, expiresAt } = await this.issueTemporaryPassword();
    const updated = await User.findOneAndUpdate(
      { _id: userId, "provisioning.jobId": jobId, mustChangePassword: true },
      { $set: { password: hash, tempPasswordExpiresAt: expiresAt } },
      { new: true, projection: { _id: 1 } },
    );
    return updated ? temporaryPassword : null;
  }

  buildGrantPeriod(job, now = new Date()) {
    const startDate = new Date(now);
    const endDate = new Date(now);
    if (job.planSnapshot.billing === "one-time") {
      // Same convention as paid one-time plans: effectively lifetime
      endDate.setFullYear(endDate.getFullYear() + 100);
    } else {
      endDate.setMonth(endDate.getMonth() + (job.durationMonths || 1));
    }
    return { startDate, endDate };
  }

  async createGrantSubscription(job, userId, courseId, reference) {
    const { startDate, endDate } = this.buildGrantPeriod(job);
    const featureAccess = SubscriptionService.setupFeatureAccess(
      job.planType,
      startDate,
      endDate,
    );

    try {
      const subscription = await Subscription.create({
        user: userId,
        courseId,
        plan: job.planType,
        planDetails: {
          name: job.planSnapshot.name,
          price: job.planSnapshot.price,
          currency: job.planSnapshot.currency,
          billing: job.planSnapshot.billing,
          features: job.planSnapshot.features,
        },
        status: "active",
        startDate,
        endDate,
        // Complimentary: no charge and nothing to auto-renew
        isRecurring: false,
        amount: 0,
        currency: job.planSnapshot.currency,
        paymentMethod: "admin_grant",
        transactionReference: reference,
        featureAccess,
        metadata: {
          source: PLAN_GRANT_SOURCE,
          grantJobId: job._id,
          grantedBy: job.createdBy,
          listPrice: job.planSnapshot.price,
        },
      });
      return subscription.toObject();
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      const existing = await Subscription.findOne({ transactionReference: reference }).lean();
      if (!existing) throw error;
      return existing;
    }
  }

  /**
   * Mirror the paid-checkout side effects for plans that include the course:
   * initialize progress and bump the course's student count (only once).
   * Failures are logged, not fatal — matching the payment verification flow.
   */
  async ensureCourseProgress(subscription, userId, courseId) {
    if (!subscription.featureAccess?.courseAccess?.hasLifetimeAccess) return;

    try {
      const hadProgress = await Progress.exists({ userId, courseId });
      await progressService.initializeProgress(userId, courseId, subscription._id);
      if (!hadProgress) {
        await Course.updateOne({ _id: courseId }, { $inc: { totalStudents: 1 } });
      }
    } catch (error) {
      logger.warn("Progress initialization failed for granted plan", {
        userId: String(userId),
        courseId: String(courseId),
        error: error.message,
      });
    }
  }

  /** One email per person listing every course granted in this pass. */
  async notify(job, item, user, account, granted, { isLastAttempt }) {
    const withCredentials = !!account.temporaryPassword;

    if (!withCredentials && !job.notifyExistingUsers) {
      return { status: NOTIFICATION_STATUS.NOT_REQUESTED, withCredentials };
    }

    const courseTitles = [
      ...new Set(granted.map((entry) => entry.item.courseTitle || job.courseTitle).filter(Boolean)),
    ];

    try {
      await withRetry(async () => {
        await this.acquireEmailSlot();
        await sendPlanAccessGrantedEmail(user.email, {
          firstName: user.firstName || item.firstName,
          planName: job.planSnapshot.name,
          courseTitles,
          accessEndsAt:
            job.planSnapshot.billing === "one-time" ? null : granted[0].sub.endDate,
          loginUrl: loginUrl(),
          credentials: withCredentials
            ? {
                email: user.email,
                temporaryPassword: account.temporaryPassword,
                expiresInDays: TEMP_PASSWORD_TTL_DAYS,
              }
            : null,
        });
      });
      return { status: NOTIFICATION_STATUS.SENT, sentAt: new Date(), withCredentials };
    } catch (error) {
      // Without the email a new user can't sign in, so retry the whole person
      // (idempotent; a fresh password is issued) before giving up.
      if (withCredentials && !isLastAttempt) {
        throw new RetryableRecipientError(`Credentials email failed: ${error.message}`);
      }
      return { status: NOTIFICATION_STATUS.FAILED, error: error.message, withCredentials };
    }
  }

  // Best-effort marketing list sync, same as self sign-up. Never blocks.
  syncMailingList(user) {
    Promise.resolve()
      .then(async () => {
        await SenderService.createSubscriber({
          email: user.email,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          phone: user.phone || "",
        });
        await SenderService.addSubscriberToGroups(user.email);
      })
      .catch((error) => {
        logger.warn("Sender sync failed for provisioned user", {
          email: user.email,
          error: error?.message || String(error),
        });
      });
  }
}

export default new PlanGrantService();
