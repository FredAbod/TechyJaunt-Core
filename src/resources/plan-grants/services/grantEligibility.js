import {
  ITEM_OUTCOME,
  PLAN_PRIORITY,
} from "../planGrant.constants.js";
import {
  hasPaidEntitlement,
  isBillingPeriodActive,
} from "../../../utils/subscription/subscriptionEntitlements.js";

/**
 * Eligibility rules for granting a plan to an EXISTING account.
 *
 * Each rule is a pure function of a prefetched context and returns either
 * null (pass) or { outcome, reason } (skip). Rules run in order and the first
 * failure wins. To add a rule, append a function here — nothing else changes.
 *
 * Context shape:
 *   user            - { status, role }
 *   planType        - requested plan ("bronze" | "silver" | "gold")
 *   planBilling     - requested plan billing ("one-time" | "monthly" | ...)
 *   subscriptions   - the user's subscriptions for the target course
 *                     (excluding the subscription this grant itself created)
 *   pendingCoursePayments - the user's pending CoursePayment rows for the course
 */

const accountRestricted = ({ user }) => {
  if (["suspended", "inactive"].includes(user.status)) {
    return {
      outcome: ITEM_OUTCOME.SKIPPED_ACCOUNT_RESTRICTED,
      reason: `Account is ${user.status}.`,
    };
  }
  return null;
};

const notStudent = ({ user }) => {
  if (user.role && user.role !== "user") {
    return {
      outcome: ITEM_OUTCOME.SKIPPED_NOT_STUDENT,
      reason: `Account has role "${user.role}"; plans can only be granted to student accounts.`,
    };
  }
  return null;
};

// A pending checkout for this course means the user may be about to pay.
// Granting now risks charging them for something they already have.
const pendingPayment = ({ subscriptions, pendingCoursePayments }) => {
  const pendingSub = subscriptions.find((sub) => sub.status === "pending");
  const pendingRef =
    pendingSub?.transactionReference ||
    pendingCoursePayments[0]?.transactionReference;

  if (pendingSub || pendingCoursePayments.length > 0) {
    return {
      outcome: ITEM_OUTCOME.SKIPPED_PENDING_PAYMENT,
      reason: `User has a pending payment for this course (ref ${pendingRef}). Resolve it before granting.`,
    };
  }
  return null;
};

const alreadyHasAccess = ({ subscriptions, planType, planBilling }) => {
  const requestedPriority = PLAN_PRIORITY[planType] || 0;

  const covering = subscriptions.find((sub) => {
    if (sub.plan === planType) {
      // One-time plans never lapse; recurring plans only count while the period is live
      return planBilling === "one-time"
        ? hasPaidEntitlement(sub)
        : isBillingPeriodActive(sub);
    }
    return (
      isBillingPeriodActive(sub) &&
      (PLAN_PRIORITY[sub.plan] || 0) > requestedPriority
    );
  });

  if (covering) {
    return {
      outcome: ITEM_OUTCOME.SKIPPED_ALREADY_HAS_ACCESS,
      reason: `User already has an active ${covering.plan} plan for this course.`,
    };
  }
  return null;
};

export const ELIGIBILITY_RULES = [
  accountRestricted,
  notStudent,
  pendingPayment,
  alreadyHasAccess,
];

/**
 * @returns {null | { outcome: string, reason: string }}
 */
export const evaluateEligibility = (context, rules = ELIGIBILITY_RULES) => {
  const ctx = {
    subscriptions: [],
    pendingCoursePayments: [],
    ...context,
  };
  for (const rule of rules) {
    const result = rule(ctx);
    if (result) return result;
  }
  return null;
};
