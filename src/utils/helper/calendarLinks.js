import moment from "moment-timezone";
import { getSessionStartMoment } from "./bookingLeadTime.js";

function stampUtc(m) {
  return moment(m).utc().format("YYYYMMDDTHHmmss[Z]");
}

function stampLocal(m) {
  return moment(m).format("YYYYMMDDTHHmmss");
}

export function getSessionRange(sessionDate, startTime, endTime, timezone = "UTC") {
  const start = getSessionStartMoment(sessionDate, startTime, timezone);
  const dateStr = moment(sessionDate).format("YYYY-MM-DD");
  let end = moment.tz(
    `${dateStr} ${(endTime || startTime || "00:00").slice(0, 5)}`,
    "YYYY-MM-DD HH:mm",
    timezone,
  );
  if (end.isValid() && start.isValid() && !end.isAfter(start)) {
    end = end.add(1, "day");
  }
  return { start, end };
}

export function buildGoogleCalendarUrl({
  title,
  sessionDate,
  startTime,
  endTime,
  timezone = "UTC",
  details = "",
  location = "",
}) {
  const { start, end } = getSessionRange(
    sessionDate,
    startTime,
    endTime,
    timezone,
  );
  if (!start.isValid() || !end.isValid()) return "";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title || "TechyJaunt Mentorship Session",
    dates: `${stampLocal(start)}/${stampLocal(end)}`,
    ctz: timezone || "UTC",
    details: details || "",
    location: location || "",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcsContent({
  title,
  sessionDate,
  startTime,
  endTime,
  timezone = "UTC",
  details = "",
  location = "",
}) {
  const { start, end } = getSessionRange(
    sessionDate,
    startTime,
    endTime,
    timezone,
  );
  if (!start.isValid() || !end.isValid()) return "";

  const escape = (value) =>
    String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TechyJaunt//Mentorship//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART:${stampUtc(start)}`,
    `DTEND:${stampUtc(end)}`,
    `SUMMARY:${escape(title || "TechyJaunt Mentorship Session")}`,
    `DESCRIPTION:${escape(details)}`,
    `LOCATION:${escape(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function calendarLinksForBooking(booking, { otherPartyName } = {}) {
  const meetingUrl = booking.meetingDetails?.meetingUrl || "";
  const title = `TechyJaunt session${otherPartyName ? ` with ${otherPartyName}` : ""}`;
  const details = [
    otherPartyName
      ? `Session with ${otherPartyName}`
      : "TechyJaunt mentorship session",
    meetingUrl ? `Join: ${meetingUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    googleCalendarUrl: buildGoogleCalendarUrl({
      title,
      sessionDate: booking.sessionDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      timezone: booking.timezone || "UTC",
      details,
      location: meetingUrl,
    }),
    icsContent: buildIcsContent({
      title,
      sessionDate: booking.sessionDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      timezone: booking.timezone || "UTC",
      details,
      location: meetingUrl,
    }),
  };
}
