/**
 * Email template for session booking confirmation (Student)
 */
const sessionBookingStudentTemplate = (studentName, tutorName, sessionDetails) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Session Booking Confirmation</title>
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
          border-left: 4px solid #3498db;
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
        .cta-button {
          display: inline-block;
          background-color: #3498db;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin: 10px 0;
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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎓 TechyJaunt</div>
          <h2 style="color: #2c3e50; margin: 0;">Session Booking Confirmed!</h2>
        </div>
        
        <div class="content">
          <p>Hi <strong>${studentName}</strong>,</p>
          
          <p>Great news! Your tutoring session has been successfully booked. Here are the details:</p>
          
          <div class="session-details">
            <h3 style="margin-top: 0; color: #2c3e50;">📅 Session Information</h3>
            <div class="detail-row">
              <span class="detail-label">Tutor:</span>
              <span>${tutorName}</span>
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
          
          ${sessionDetails.meetingUrl ? `
          <div class="meeting-info">
            <h3 style="margin-top: 0; color: #27ae60;">💻 Meeting Information</h3>
            <p><strong>Meeting URL:</strong> <a href="${sessionDetails.meetingUrl}" target="_blank">${sessionDetails.meetingUrl}</a></p>
            <p><strong>Meeting ID:</strong> ${sessionDetails.meetingId}</p>
            ${sessionDetails.password ? `<p><strong>Password:</strong> ${sessionDetails.password}</p>` : ''}
          </div>
          ` : ''}
          
          <p><strong>What's Next?</strong></p>
          <ul>
            <li>Wait for your tutor to confirm the session</li>
            <li>Prepare any questions or materials you'd like to discuss</li>
            <li>Join the meeting 5 minutes before the scheduled time</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard/bookings" class="cta-button">View My Bookings</a>
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

export default sessionBookingStudentTemplate;
