/** Subscription statuses that represent a completed (paid) purchase. */
export const PAID_SUBSCRIPTION_STATUSES = ["active", "expired"];

/** Features that require course ownership (Bronze or Gold). */
export const COURSE_REQUIRED_FEATURES = [
  "courseAccess",
  "certificate",
  "premiumResources",
];

/** Non-billing features aggregated from paid subscriptions. */
export const LIFETIME_COURSE_FEATURES = [
  ...COURSE_REQUIRED_FEATURES,
  "linkedinOptimization",
  "alumniCommunity",
  "networking",
];

/** Features limited to the current billing period (active + unexpired endDate). */
export const BILLING_PERIOD_FEATURES = ["aiTutor", "mentorship"];

export function hasPaidEntitlement(subscription) {
  return (
    subscription &&
    PAID_SUBSCRIPTION_STATUSES.includes(subscription.status)
  );
}

export function isBillingPeriodActive(subscription) {
  return (
    hasPaidEntitlement(subscription) &&
    subscription.status === "active" &&
    subscription.endDate &&
    new Date(subscription.endDate) > new Date()
  );
}

export function hasCourseEntitlement(subscription) {
  if (!hasPaidEntitlement(subscription)) return false;
  const courseAccess = subscription.featureAccess?.courseAccess;
  if (!courseAccess) return false;
  if (courseAccess.hasLifetimeAccess) return true;
  return (
    Array.isArray(courseAccess.courses) && courseAccess.courses.length > 0
  );
}

export function isLifetimeCourseFeature(featureName) {
  return LIFETIME_COURSE_FEATURES.includes(featureName);
}

export function isCourseRequiredFeature(featureName) {
  return COURSE_REQUIRED_FEATURES.includes(featureName);
}

export function isBillingPeriodFeature(featureName) {
  return BILLING_PERIOD_FEATURES.includes(featureName);
}
