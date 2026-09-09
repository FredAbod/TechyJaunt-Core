import moment from "moment-timezone";

/** Sessions must start at least this many hours from now. */
export const MIN_BOOKING_LEAD_HOURS = 24;

export function getSessionStartMoment(date, startTime, timezone = "UTC") {
  const dateStr = moment(date).format("YYYY-MM-DD");
  const time = (startTime || "00:00").slice(0, 5);
  return moment.tz(`${dateStr} ${time}`, "YYYY-MM-DD HH:mm", timezone);
}

export function isSlotBookable(date, startTime, timezone = "UTC") {
  const start = getSessionStartMoment(date, startTime, timezone);
  if (!start.isValid()) return false;
  return start.isSameOrAfter(moment().add(MIN_BOOKING_LEAD_HOURS, "hours"));
}

export function assertMinimumLeadTime(date, startTime, timezone = "UTC") {
  if (!isSlotBookable(date, startTime, timezone)) {
    const error = new Error(
      "Sessions must be booked at least 24 hours in advance so tutors can prepare.",
    );
    error.statusCode = 400;
    throw error;
  }
}
