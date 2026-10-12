import bcrypt from "bcryptjs";
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
  TEMP_PASSWORD_TTL_DAYS,
  TERMINAL_JOB_STATUSES,
} from "../planGrant.constants.js";

const BCRYPT_ROUNDS = 12; // matches auth.service
const SUPPORTED_BILLING = ["one-time", "monthly"]; // Subscription.planDetails.billing enum
const DEFAULT_DURATION_MONTHS = { monthly: 1 };
const USER_FIELDS =
  "email firstName lastName role status password mustChangePassword provisioning";

const emailSchema = Joi.string().email({ tlds: { allow: false } }).max(254);

const isDuplicateKeyError = (error) => error?.code === 11000;

const groupBy = (rows, key) => {
  const map = new Map();
  for (const row of rows) {
    const id = String(row[key]);
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(row);
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

/** Error that asks the worker to retry the whole item later. */
class RetryableItemError extends Error {}

class PlanGrantService {
  // ==================== JOB CREATION ====================

  /**
   * Validate the request, snapshot the plan and enqueue one item per recipient.
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

    const { planType, courseId, note } = payload;
    const notifyExistingUsers = payload.notifyExistingUsers !== false;

    const plan = await SubscriptionPlan.getPlanByType(planType);
    if (!plan) {
      throw new AppError(`Plan "${planType}" does not exist or is inactive`, 400);
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

    const course = await Course.findById(courseId).select(
      "title status instructor assistants",
    );
    if (!course) throw new AppError("Course not found", 404);
    if (course.status === "archived") {
      throw new AppError("Cannot grant access to an archived course", 400);
    }
    this.assertCanManageCourse(admin, course);

    const { items, submitted, duplicatesRemoved } = this.normalizeRecipients(
      payload.recipients,
    );
    if (items.length === 0) {
      throw new AppError("No recipients to process", 400);
    }

    const invalid = items.filter((item) => item.status === ITEM_STATUS.FAILED);

    // Build the job in memory and insert items first, so the worker can never
    // claim a job whose items haven't been written yet.
    const job = new PlanGrantJob({
      createdBy: admin._id,
      idempotencyKey: idempotencyKey || undefined,
      planType: plan.planType,
      planSnapshot: {
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        billing: plan.billing,
        features: plan.features,
      },
      courseId: course._id,
      courseTitle: course.title,
      durationMonths,
      notifyExistingUsers,
      note,
      status: JOB_STATUS.QUEUED,
      totals: {
        submitted,
        duplicatesRemoved,
        total: items.length,
        failed: invalid.length,
        pending: items.length - invalid.length,
      },
    });

    await PlanGrantItem.insertMany(
      items.map((item) => ({ ...item, job: job._id })),
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
      courseId: job.courseId.toString(),
      total: items.length,
    });

    return { job, reused: false };
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

  // Same rule as the admin invite flow: non-super admins only manage courses they teach.
  assertCanManageCourse(admin, course) {
    if (admin.role === "super admin") return;
    const adminId = admin._id.toString();
    const isInstructor = course.instructor?.toString() === adminId;
    const isAssistant = (course.assistants || []).some(
      (id) => id.toString() === adminId,
    );
    if (!isInstructor && !isAssistant) {
      throw new AppError(
        "You don't have permission to grant access to this course",
        403,
      );
    }
  }

  /**
   * Trim, lowercase, dedupe and validate recipients.
   * Invalid emails become terminal failed items so they appear in the report.
   */
  normalizeRecipients(recipients = []) {
    const seen = new Set();
    const items = [];
    let duplicatesRemoved = 0;

    recipients.forEach((raw) => {
      const entry = typeof raw === "string" ? { email: raw } : raw || {};
      const email = String(entry.email || "").trim().toLowerCase();

      if (seen.has(email)) {
        duplicatesRemoved += 1;
        return;
      }
      seen.add(email);

      const base = {
        index: items.length,
        email,
        firstName: entry.firstName?.trim() || undefined,
        lastName: entry.lastName?.trim() || undefined,
      };

      if (emailSchema.validate(email).error) {
        items.push({
          ...base,
          // Keep something unique and displayable for blank/garbage input
          email: email || `(blank #${items.length + 1})`,
          status: ITEM_STATUS.FAILED,
          outcome: ITEM_OUTCOME.INVALID_EMAIL,
          reason: "Not a valid email address",
          notification: { status: NOTIFICATION_STATUS.NOT_REQUESTED },
          processedAt: new Date(),
        });
        return;
      }

      items.push(base);
    });

    return { items, submitted: recipients.length, duplicatesRemoved };
  }

  // ==================== QUERIES ====================

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
      .lean();
    if (!job) throw new AppError("Plan grant job not found", 404);

    // Totals are only snapshotted on completion; compute live while running
    if (!TERMINAL_JOB_STATUSES.includes(job.status)) {
      job.totals = { ...job.totals, ...(await this.computeTotals(job._id)) };
    }
    job.outcomes = await this.computeOutcomeBreakdown(job._id);
    return job;
  }

  async listItems(jobId, { page = 1, limit = 50, status, outcome } = {}) {
    const exists = await PlanGrantJob.exists({ _id: jobId });
    if (!exists) throw new AppError("Plan grant job not found", 404);

    const filter = { job: jobId };
    if (status) filter.status = status;
    if (outcome) filter.outcome = outcome;

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
    const totals = { granted: 0, skipped: 0, failed: 0, pending: 0 };
    rows.forEach((row) => {
      totals[row._id] = row.count;
    });
    return totals;
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

  // ==================== PROCESSING (called by the worker) ====================

  /**
   * Process the next batch of pending items for a job.
   * @returns {number} number of items processed (0 when the job is drained)
   */
  async processNextBatch(job) {
    const items = await PlanGrantItem.find({
      job: job._id,
      status: ITEM_STATUS.PENDING,
    })
      .sort({ index: 1 })
      .limit(PLAN_GRANT_LIMITS.BATCH_SIZE)
      .lean();

    if (items.length === 0) return 0;

    const ctx = await this.loadBatchContext(job, items);
    await mapWithConcurrency(items, PLAN_GRANT_LIMITS.CONCURRENCY, (item) =>
      this.processItemSafely(job, item, ctx),
    );
    return items.length;
  }

  async finalizeJob(job, owner) {
    const totals = await this.computeTotals(job._id);
    const status =
      totals.failed > 0
        ? JOB_STATUS.COMPLETED_WITH_ERRORS
        : JOB_STATUS.COMPLETED;

    await PlanGrantJob.updateOne(
      { _id: job._id, leaseOwner: owner },
      {
        $set: {
          status,
          completedAt: new Date(),
          "totals.granted": totals.granted,
          "totals.skipped": totals.skipped,
          "totals.failed": totals.failed,
          "totals.pending": totals.pending,
        },
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

  /** Prefetch everything a batch needs in a fixed number of queries (no N+1). */
  async loadBatchContext(job, items) {
    const emails = items.map((item) => item.email);
    const refs = items.map((item) => this.grantReference(job._id, item._id));

    const [users, grantSubs] = await Promise.all([
      User.find({ email: { $in: emails } }).select(USER_FIELDS).lean(),
      Subscription.find({ transactionReference: { $in: refs } })
        .select("_id transactionReference featureAccess")
        .lean(),
    ]);

    const courseState = await this.loadCourseState(
      users.map((user) => user._id),
      job.courseId,
    );

    return {
      usersByEmail: new Map(users.map((user) => [user.email, user])),
      grantSubsByRef: new Map(
        grantSubs.map((sub) => [sub.transactionReference, sub]),
      ),
      ...courseState,
    };
  }

  async loadCourseState(userIds, courseId) {
    if (userIds.length === 0) {
      return { subsByUser: new Map(), pendingPaymentsByUser: new Map() };
    }
    const [subs, pendingPayments] = await Promise.all([
      Subscription.find({
        user: { $in: userIds },
        courseId,
        status: { $in: ["pending", "active", "expired"] },
      })
        .select("user plan status endDate transactionReference")
        .lean(),
      CoursePayment.find({
        user: { $in: userIds },
        course: courseId,
        status: "pending",
      })
        .select("user transactionReference")
        .lean(),
    ]);
    return {
      subsByUser: groupBy(subs, "user"),
      pendingPaymentsByUser: groupBy(pendingPayments, "user"),
    };
  }

  async processItemSafely(job, item, ctx) {
    const isLastAttempt =
      item.attempts + 1 >= PLAN_GRANT_LIMITS.MAX_ITEM_ATTEMPTS;

    try {
      const result = await this.processItem(job, item, ctx, { isLastAttempt });
      await PlanGrantItem.updateOne(
        { _id: item._id },
        {
          $set: { ...result, processedAt: new Date() },
          $inc: { attempts: 1 },
          $unset: { lastError: 1 },
        },
      );
    } catch (error) {
      logger.error("Plan grant item failed", {
        jobId: job._id.toString(),
        itemId: item._id.toString(),
        attempt: item.attempts + 1,
        error: error.message,
      });

      const update = {
        $inc: { attempts: 1 },
        $set: { lastError: error.message },
      };
      if (isLastAttempt) {
        update.$set.status = ITEM_STATUS.FAILED;
        update.$set.outcome = ITEM_OUTCOME.ERROR;
        update.$set.reason = error.message;
        update.$set.processedAt = new Date();
      }
      // Not the last attempt: stays pending and is picked up by the next batch
      await PlanGrantItem.updateOne({ _id: item._id }, update);
    }
  }

  /**
   * Grant the plan to one recipient. Safe to re-run after a crash at any step:
   * - user creation is guarded by the unique email index
   * - the subscription uses a deterministic reference with a unique index
   * - users provisioned by this job are recognised via `provisioning.jobId`
   */
  async processItem(job, item, ctx, { isLastAttempt }) {
    const reference = this.grantReference(job._id, item._id);
    let grantSub = ctx.grantSubsByRef.get(reference);
    let user = ctx.usersByEmail.get(item.email);
    let account = null; // { action, temporaryPassword? }
    let courseState = ctx;

    if (!user) {
      const created = await this.createProvisionedUser(job, item);
      if (created) {
        user = created.user;
        account = {
          action: "created",
          temporaryPassword: created.temporaryPassword,
        };
      } else {
        // Lost a race with a concurrent sign-up: treat as an existing user
        user = await User.findOne({ email: item.email })
          .select(USER_FIELDS)
          .lean();
        if (!user) throw new Error("User lookup failed after duplicate key");
        courseState = await this.loadCourseState([user._id], job.courseId);
      }
    }

    if (!account) {
      if (this.isProvisionedByJob(user, job._id)) {
        // Retry of an item this job already provisioned. The plaintext password
        // was never stored, so issue a fresh one if the email didn't go out.
        account = { action: user.provisioning.action || "created" };
        if (
          user.mustChangePassword &&
          item.notification?.status !== NOTIFICATION_STATUS.SENT
        ) {
          account.temporaryPassword = await this.reissueTemporaryPassword(
            user._id,
            job._id,
          );
        }
      } else {
        if (!grantSub) {
          const userId = String(user._id);
          const ineligible = evaluateEligibility({
            user,
            planType: job.planType,
            planBilling: job.planSnapshot.billing,
            subscriptions: courseState.subsByUser.get(userId) || [],
            pendingCoursePayments:
              courseState.pendingPaymentsByUser.get(userId) || [],
          });
          if (ineligible) {
            return {
              status: ITEM_STATUS.SKIPPED,
              ...ineligible,
              user: user._id,
              notification: { status: NOTIFICATION_STATUS.NOT_REQUESTED },
            };
          }
        }

        // Started sign-up but never set a password: give them credentials
        const temporaryPassword = user.password
          ? null
          : await this.activateExistingUser(job, item, user);
        account = temporaryPassword
          ? { action: "activated", temporaryPassword }
          : { action: "existing" };
      }
    }

    if (!grantSub) {
      grantSub = await this.createGrantSubscription(job, user._id, reference);
    }

    await this.ensureCourseProgress(grantSub, user._id, job.courseId);

    const notification = await this.notify(job, item, user, account, {
      isLastAttempt,
      accessEndsAt: grantSub.endDate,
    });

    const outcome = {
      created: ITEM_OUTCOME.GRANTED_NEW_ACCOUNT,
      activated: ITEM_OUTCOME.GRANTED_ACTIVATED_ACCOUNT,
      existing: ITEM_OUTCOME.GRANTED_EXISTING_ACCOUNT,
    }[account.action];

    return {
      status: ITEM_STATUS.GRANTED,
      outcome,
      reason:
        notification.status === NOTIFICATION_STATUS.FAILED &&
        account.temporaryPassword
          ? "Access granted, but the credentials email failed. The user can use 'Forgot password' to sign in."
          : undefined,
      user: user._id,
      subscription: grantSub._id,
      notification,
    };
  }

  isProvisionedByJob(user, jobId) {
    return (
      user.provisioning?.source === PLAN_GRANT_SOURCE &&
      String(user.provisioning?.jobId) === String(jobId)
    );
  }

  async issueTemporaryPassword() {
    const temporaryPassword = generateTemporaryPassword();
    const hash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
    const expiresAt = new Date(
      Date.now() + TEMP_PASSWORD_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
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
    const { temporaryPassword, hash, expiresAt } =
      await this.issueTemporaryPassword();

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
    const { temporaryPassword, hash, expiresAt } =
      await this.issueTemporaryPassword();

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
    const { temporaryPassword, hash, expiresAt } =
      await this.issueTemporaryPassword();
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

  async createGrantSubscription(job, userId, reference) {
    const { startDate, endDate } = this.buildGrantPeriod(job);
    const featureAccess = SubscriptionService.setupFeatureAccess(
      job.planType,
      startDate,
      endDate,
    );

    try {
      const subscription = await Subscription.create({
        user: userId,
        courseId: job.courseId,
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
      const existing = await Subscription.findOne({
        transactionReference: reference,
      }).lean();
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
      await progressService.initializeProgress(
        userId,
        courseId,
        subscription._id,
      );
      if (!hadProgress) {
        await Course.updateOne(
          { _id: courseId },
          { $inc: { totalStudents: 1 } },
        );
      }
    } catch (error) {
      logger.warn("Progress initialization failed for granted plan", {
        userId: String(userId),
        courseId: String(courseId),
        error: error.message,
      });
    }
  }

  async notify(job, item, user, account, { isLastAttempt, accessEndsAt }) {
    const withCredentials = !!account.temporaryPassword;

    if (!withCredentials && item.notification?.status === NOTIFICATION_STATUS.SENT) {
      return item.notification;
    }
    if (!withCredentials && !job.notifyExistingUsers) {
      return { status: NOTIFICATION_STATUS.NOT_REQUESTED };
    }

    try {
      await withRetry(() =>
        sendPlanAccessGrantedEmail(user.email, {
          firstName: user.firstName || item.firstName,
          planName: job.planSnapshot.name,
          courseTitle: job.courseTitle,
          accessEndsAt:
            job.planSnapshot.billing === "one-time" ? null : accessEndsAt,
          loginUrl: loginUrl(),
          credentials: withCredentials
            ? {
                email: user.email,
                temporaryPassword: account.temporaryPassword,
                expiresInDays: TEMP_PASSWORD_TTL_DAYS,
              }
            : null,
        }),
      );
      return { status: NOTIFICATION_STATUS.SENT, sentAt: new Date() };
    } catch (error) {
      // Without the email a new user can't sign in, so retry the whole item
      // (it is idempotent and will issue a fresh password) before giving up.
      if (withCredentials && !isLastAttempt) {
        throw new RetryableItemError(
          `Credentials email failed: ${error.message}`,
        );
      }
      return { status: NOTIFICATION_STATUS.FAILED, error: error.message };
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
