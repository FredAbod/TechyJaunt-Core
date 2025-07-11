/**
 * Email template for session booking notification (Tutor)
 */
const sessionBookingTutorTemplate = (tutorName, studentName, sessionDetails) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Session Booking</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          color: #2c3e50;
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .content {
          margin-bottom: 30px;
        }
        .session-details {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #e74c3c;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .detail-label {
          font-weight: bold;
          color: #2c3e50;
        }
        .meeting-info {
          background-color: #e8f5e8;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
          border-left: 4px solid #27ae60;
        }
        .action-buttons {
          text-align: center;
          margin: 30px 0;
        }
        .cta-button {
          display: inline-block;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin: 10px 5px;
          color: white;
        }
        .confirm-btn {
          background-color: #27ae60;
        }
        .reschedule-btn {
          background-color: #f39c12;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #7f8c8d;
          font-size: 14px;
        }
        .status-badge {
          background-color: #f39c12;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
        }
        .student-notes {
          background-color: #fff3cd;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
          border-left: 4px solid #ffc107;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎓 TechyJaunt</div>
          <h2 style="color: #2c3e50; margin: 0;">New Session Booking!</h2>
        </div>
        
        <div class="content">
          <p>Hi <strong>${tutorName}</strong>,</p>
          
          <p>You have a new tutoring session booking request. Please review the details below:</p>
          
          <div class="session-details">
            <h3 style="margin-top: 0; color: #2c3e50;">👨‍🎓 Student Information</h3>
            <div class="detail-row">
              <span class="detail-label">Student:</span>
              <span>${studentName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span>${sessionDetails.date}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Time:</span>
              <span>${sessionDetails.startTime} - ${sessionDetails.endTime}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Duration:</span>
              <span>${sessionDetails.duration} minutes</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Session Type:</span>
              <span style="text-transform: capitalize;">${sessionDetails.sessionType}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="status-badge">${sessionDetails.status}</span>
            </div>
          </div>
          
          ${sessionDetails.studentNotes ? `
          <div class="student-notes">
            <h3 style="margin-top: 0; color: #856404;">📝 Student Notes</h3>
            <p style="margin: 0;">${sessionDetails.studentNotes}</p>
          </div>
          ` : ''}
          
          ${sessionDetails.meetingUrl ? `
          <div class="meeting-info">
            <h3 style="margin-top: 0; color: #27ae60;">💻 Meeting Information</h3>
            <p><strong>Meeting URL:</strong> <a href="${sessionDetails.meetingUrl}" target="_blank">${sessionDetails.meetingUrl}</a></p>
            <p><strong>Meeting ID:</strong> ${sessionDetails.meetingId}</p>
            ${sessionDetails.password ? `<p><strong>Password:</strong> ${sessionDetails.password}</p>` : ''}
          </div>
          ` : ''}
          
          <p><strong>Action Required:</strong></p>
          <ul>
            <li>Review the session details and confirm your availability</li>
            <li>Confirm or reschedule the session through your dashboard</li>
            <li>Prepare materials if needed for the session</li>
          </ul>
          
          <div class="action-buttons">
            <a href="${process.env.FRONTEND_URL}/dashboard/bookings?action=confirm&id=${sessionDetails.bookingId}" class="cta-button confirm-btn">Confirm Session</a>
            <a href="${process.env.FRONTEND_URL}/dashboard/bookings?action=reschedule&id=${sessionDetails.bookingId}" class="cta-button reschedule-btn">Reschedule</a>
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard/bookings" style="color: #3498db; text-decoration: none;">View All Bookings →</a>
          </div>
        </div>
        
        <div class="footer">
          <p>Need help? Contact us at <a href="mailto:support@techyjaunt.com">support@techyjaunt.com</a></p>
          <p>This is an automated message from TechyJaunt Learning Platform</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export default sessionBookingTutorTemplate;
