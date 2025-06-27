const serverDownTemplate = (errorMessage = "") => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Server Issue Alert - TechyJaunt</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 0;
                background-color: #f4f4f4;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                color: white;
                padding: 40px 20px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 300;
            }
            .content {
                padding: 40px 30px;
            }
            .error-icon {
                font-size: 60px;
                text-align: center;
                margin-bottom: 20px;
            }
            .alert-box {
                background-color: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
                padding: 20px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .error-details {
                background-color: #f8f9fa;
                border-left: 4px solid #dc3545;
                padding: 15px;
                margin: 20px 0;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                word-break: break-all;
            }
            .footer {
                background-color: #f8f9fa;
                padding: 20px;
                text-align: center;
                color: #666;
                font-size: 14px;
            }
            .footer p {
                margin: 5px 0;
            }
            
            /* Mobile Responsive */
            @media screen and (max-width: 640px) {
                .container {
                    margin: 10px;
                    border-radius: 5px;
                }
                .header {
                    padding: 30px 20px;
                }
                .header h1 {
                    font-size: 24px;
                }
                .content {
                    padding: 30px 20px;
                }
                .error-icon {
                    font-size: 45px;
                }
            }
            
            @media screen and (max-width: 480px) {
                .header h1 {
                    font-size: 20px;
                }
                .content {
                    padding: 20px 15px;
                }
                .error-icon {
                    font-size: 40px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚨 Server Issue Alert</h1>
                <p>TechyJaunt System Notification</p>
            </div>
            <div class="content">
                <div class="error-icon">⚠️</div>
                
                <div class="alert-box">
                    <strong>Server Down Alert:</strong><br>
                    We've detected an issue with the TechyJaunt Learning Platform server.
                </div>
                
                <p>
                    <strong>Status:</strong> The server is currently experiencing technical difficulties.<br>
                    <strong>Impact:</strong> Users may experience service interruptions.<br>
                    <strong>Action Required:</strong> Immediate technical attention needed.
                </p>
                
                ${errorMessage ? `
                <div class="error-details">
                    <strong>Error Details:</strong><br>
                    ${errorMessage}
                </div>
                ` : ''}
                
                <p>
                    Our technical team has been automatically notified and is working to resolve this issue as quickly as possible.
                    Please check the server logs for more detailed information.
                </p>
                
                <p style="margin-top: 30px;">
                    <strong>Next Steps:</strong>
                </p>
                <ul>
                    <li>Check server logs immediately</li>
                    <li>Contact the development team</li>
                    <li>Monitor system status</li>
                    <li>Prepare user communication if needed</li>
                </ul>
            </div>
            <div class="footer">
                <p>© 2025 TechyJaunt. All rights reserved.</p>
                <p>This is an automated system alert.</p>
                <p>Generated at: ${new Date().toLocaleString()}</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

export default serverDownTemplate;