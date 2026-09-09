import {
  studentMentorshipUrl,
  tutorBookingsUrl,
} from "../helper/frontendUrls.js";

const sessionRescheduledTemplate = ({
  recipientName,
  otherPartyName,
  role,
  sessionDetails,
}) => {
  const inboxUrl =
    role === "tutor" ? tutorBookingsUrl() : studentMentorshipUrl();
  const otherLabel = role === "tutor" ? "Student" : "Tutor";
  const calendarBtn = sessionDetails.googleCalendarUrl
    ? `<a href="${sessionDetails.googleCalendarUrl}" class="cta" style="background-color:#0f9d58;margin-left:8px;" target="_blank" rel="noreferrer">Add to Google Calendar</a>`
    : "";

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Session rescheduled - TechyJaunt</title>
    <style>
      body { font-family: Arial, sans-serif; color: #333; background: #f4f4f4; }
      .container { max-width: 600px; margin: 0 auto; padding: 24px; background: #fff; border-radius: 10px; }
      .cta { display:inline-block; padding: 12px 22px; background:#3498db; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold; }
      .details { background:#f8f9fa; padding:16px; border-radius:8px; border-left:4px solid #3498db; margin:16px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Your session was rescheduled</h2>
      <p>Hi <strong>${recipientName}</strong>,</p>
      <p>The mentorship session has been moved to a new time. Please use the updated details below.</p>
      <div class="details">
        <p><strong>${otherLabel}:</strong> ${otherPartyName}</p>
        <p><strong>New date:</strong> ${sessionDetails.date}</p>
        <p><strong>New time:</strong> ${sessionDetails.startTime} - ${sessionDetails.endTime} (${sessionDetails.timezone || "UTC"})</p>
        ${sessionDetails.reason ? `<p><strong>Reason:</strong> ${sessionDetails.reason}</p>` : ""}
        ${sessionDetails.meetingUrl ? `<p><strong>Meeting link:</strong> <a href="${sessionDetails.meetingUrl}">${sessionDetails.meetingUrl}</a></p>` : ""}
      </div>
      <p>You will still get reminder emails 1 hour, 30 minutes, and 15 minutes before the new start time.</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${inboxUrl}" class="cta">View session</a>
        ${calendarBtn}
      </p>
      <p style="font-size:12px;color:#777">This is an automated message from TechyJaunt.</p>
    </div>
  </body>
  </html>
  `;
};

export default sessionRescheduledTemplate;
