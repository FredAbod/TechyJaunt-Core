const sessionReminderTutorTemplate = (tutorName, studentName, sessionDetails, reminderType) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Session Reminder - TechyJaunt</title>
    <style>
      body { font-family: Arial, sans-serif; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #fff; border-radius: 8px; }
      .cta { display:inline-block; padding: 10px 16px; background:#2ecc71; color:#fff; text-decoration:none; border-radius:6px }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Reminder: Upcoming tutoring session</h2>
      <p>Hi <strong>${tutorName}</strong>,</p>
      <p>This is a ${reminderType} reminder for your session with <strong>${studentName}</strong>:</p>
      <ul>
        <li><strong>Date:</strong> ${sessionDetails.date}</li>
        <li><strong>Time:</strong> ${sessionDetails.startTime} - ${sessionDetails.endTime} (${sessionDetails.timezone || 'UTC'})</li>
        <li><strong>Duration:</strong> ${sessionDetails.duration} minutes</li>
      </ul>
      ${sessionDetails.meetingUrl ? `<p><strong>Meeting link:</strong> <a href="${sessionDetails.meetingUrl}">${sessionDetails.meetingUrl}</a></p>` : ''}
      <p>Please be ready and join the meeting on time.</p>
      <p style="margin-top:20px">Thanks,<br/>TechyJaunt Team</p>
      <p style="font-size:12px;color:#777">This is an automated reminder.</p>
    </div>
  </body>
  </html>
  `;
};

export default sessionReminderTutorTemplate;
