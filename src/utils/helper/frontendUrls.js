/**
 * Canonical frontend paths used in emails and redirects.
 * Set FRONTEND_URL per environment (staging vs production) — no trailing slash.
 */
export function getFrontendBaseUrl() {
  const raw = process.env.FRONTEND_URL || "";
  return raw.replace(/\/$/, "");
}

export function tutorBookingsUrl({ action, id } = {}) {
  const base = `${getFrontendBaseUrl()}/learning-hub/tutor/dashboard/bookings`;
  const params = new URLSearchParams();
  if (action) params.set("action", action);
  if (id) params.set("id", id);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function studentMentorshipUrl() {
  return `${getFrontendBaseUrl()}/learning-hub/dashboard/mentorship`;
}

export function studentSessionUrl(bookingId) {
  const base = studentMentorshipUrl();
  if (!bookingId) return base;
  return `${base}?session=${encodeURIComponent(String(bookingId))}`;
}

export function dashboardSessionUrl({ bookingId, role } = {}) {
  if (["tutor", "admin", "super admin"].includes(role)) {
    return tutorBookingsUrl({ id: bookingId });
  }
  return studentSessionUrl(bookingId);
}

export function studentMessagesUrl({ withUserId } = {}) {
  const base = `${getFrontendBaseUrl()}/learning-hub/dashboard/mentorship/messages`;
  if (!withUserId) return base;
  return `${base}?with=${encodeURIComponent(withUserId)}`;
}

export function tutorMessagesUrl({ withUserId } = {}) {
  const base = `${getFrontendBaseUrl()}/learning-hub/tutor/dashboard/messages`;
  if (!withUserId) return base;
  return `${base}?with=${encodeURIComponent(withUserId)}`;
}

export function adminDashboardUrl() {
  return `${getFrontendBaseUrl()}/learning-hub/admin/dashboard`;
}

/** Paystack return URL after a successful course/plan checkout. */
export function subscriptionConfirmationUrl(courseId) {
  return `${getFrontendBaseUrl()}/learning-hub/dashboard/courses/checkout/confirmation/${courseId}`;
}
