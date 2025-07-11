/**
 * Email template for session booking notification (Admin)
 */
const sessionBookingAdminTemplate = (studentName, tutorName, sessionDetails) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Session Booking - Admin Notification</title>
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
          border-left: 4px solid #9b59b6;
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
        .stats-row {
          display: flex;
          justify-content: space-around;
          margin: 20px 0;
          text-align: center;
        }
        .stat-item {
          background-color: #ecf0f1;
          padding: 15px;
          border-radius: 8px;
          flex: 1;
          margin: 0 5px;
        }
        .stat-number {
          font-size: 24px;
          font-weight: bold;
          color: #2c3e50;
        }
        .stat-label {
          font-size: 12px;
          color: #7f8c8d;
        }
        .cta-button {
          display: inline-block;
          background-color: #9b59b6;
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
        .admin-actions {
          background-color: #e8f4fd;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
          border-left: 4px solid #3498db;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎓 TechyJaunt Admin</div>
          <h2 style="color: #2c3e50; margin: 0;">New Session Booking</h2>
        </div>
        
        <div class="content">
          <p>Hi Admin,</p>
          
          <p>A new tutoring session has been booked on the platform. Here are the details:</p>
          
          <div class="session-details">
            <h3 style="margin-top: 0; color: #2c3e50;">📅 Session Details</h3>
            <div class="detail-row">
              <span class="detail-label">Student:</span>
              <span>${studentName}</span>
            </div>
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
            <div class="detail-row">
              <span class="detail-label">Booking ID:</span>
              <span>${sessionDetails.bookingId}</span>
            </div>
          </div>
          
          ${sessionDetails.studentNotes ? `
          <div class="admin-actions">
            <h3 style="margin-top: 0; color: #2980b9;">📝 Student Notes</h3>
            <p style="margin: 0;">${sessionDetails.studentNotes}</p>
          </div>
          ` : ''}
          
          <div class="admin-actions">
            <h3 style="margin-top: 0; color: #2980b9;">⚙️ Admin Actions Available</h3>
            <ul style="margin: 0;">
              <li>Monitor session confirmation by tutor</li>
              <li>View payment status and processing</li>
              <li>Access session management tools</li>
              <li>Review booking patterns and analytics</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/admin/bookings" class="cta-button">View Admin Dashboard</a>
          </div>
          
          <div class="stats-row">
            <div class="stat-item">
              <div class="stat-number">📊</div>
              <div class="stat-label">Booking Analytics</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">💰</div>
              <div class="stat-label">Revenue Tracking</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">👥</div>
              <div class="stat-label">User Management</div>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>This is an automated admin notification from TechyJaunt Learning Platform</p>
          <p>Manage notifications in your admin settings</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export default sessionBookingAdminTemplate;
