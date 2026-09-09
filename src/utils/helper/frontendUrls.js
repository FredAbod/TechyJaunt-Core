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
