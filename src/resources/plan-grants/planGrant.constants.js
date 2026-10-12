const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const PLAN_GRANT_LIMITS = {
  // Hard cap on recipients per request (keeps the JSON body under express's 100kb default)
  MAX_RECIPIENTS: toPositiveInt(process.env.PLAN_GRANT_MAX_RECIPIENTS, 500),
  // Items loaded and prefetched per worker pass
  BATCH_SIZE: 50,
  // Items processed in parallel within a batch (bcrypt + email are the bottlenecks)
  CONCURRENCY: toPositiveInt(process.env.PLAN_GRANT_CONCURRENCY, 5),
  // A worker must renew its lease within this window or another instance can take over
  LEASE_MS: 2 * 60 * 1000,
  // Attempts per item before it is marked failed
  MAX_ITEM_ATTEMPTS: 3,
  // Times a job may be claimed (crash recovery) before it is marked failed
  MAX_JOB_CLAIMS: 5,
  MAX_DURATION_MONTHS: 24,
};

export const TEMP_PASSWORD_TTL_DAYS = toPositiveInt(
  process.env.TEMP_PASSWORD_TTL_DAYS,
  7,
);

export const PLAN_GRANT_SOURCE = "admin_plan_grant";

/** Roles allowed to run plan grants. */
export const PLAN_GRANT_ADMIN_ROLES = ["admin", "super admin"];

export const JOB_STATUS = {
  QUEUED: "queued",
  PROCESSING: "processing",
  COMPLETED: "completed",
  COMPLETED_WITH_ERRORS: "completed_with_errors",
  FAILED: "failed",
};

export const TERMINAL_JOB_STATUSES = [
  JOB_STATUS.COMPLETED,
  JOB_STATUS.COMPLETED_WITH_ERRORS,
  JOB_STATUS.FAILED,
];

export const ITEM_STATUS = {
  PENDING: "pending",
  GRANTED: "granted",
  SKIPPED: "skipped",
  FAILED: "failed",
};

/** Machine-readable reason for an item's final state. */
export const ITEM_OUTCOME = {
  GRANTED_NEW_ACCOUNT: "GRANTED_NEW_ACCOUNT",
  GRANTED_ACTIVATED_ACCOUNT: "GRANTED_ACTIVATED_ACCOUNT",
  GRANTED_EXISTING_ACCOUNT: "GRANTED_EXISTING_ACCOUNT",
  SKIPPED_ALREADY_HAS_ACCESS: "SKIPPED_ALREADY_HAS_ACCESS",
  SKIPPED_PENDING_PAYMENT: "SKIPPED_PENDING_PAYMENT",
  SKIPPED_ACCOUNT_RESTRICTED: "SKIPPED_ACCOUNT_RESTRICTED",
  SKIPPED_NOT_STUDENT: "SKIPPED_NOT_STUDENT",
  INVALID_EMAIL: "INVALID_EMAIL",
  ERROR: "ERROR",
};

export const NOTIFICATION_STATUS = {
  PENDING: "pending",
  SENT: "sent",
  FAILED: "failed",
  NOT_REQUESTED: "not_requested",
};

/** Mirrors the upgrade/downgrade ordering used at checkout. */
export const PLAN_PRIORITY = { gold: 3, silver: 2, bronze: 1 };
