const resetPasswordTemplate = (firstName = "") => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Successful - TechyJaunt</title>
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
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
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
                text-align: center;
            }
            .greeting {
                font-size: 20px;
                margin-bottom: 20px;
                color: #333;
            }
            .success-icon {
                font-size: 60px;
                margin-bottom: 20px;
            }
            .message {
                color: #666;
                margin-bottom: 30px;
                line-height: 1.6;
            }
            .confirmation-box {
                background-color: #d4edda;
                border: 1px solid #c3e6cb;
                color: #155724;
                padding: 20px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .security-notice {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                font-size: 14px;
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
                .success-icon {
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
                .success-icon {
                    font-size: 40px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Password Reset Successful</h1>
                <p>TechyJaunt Learning Platform</p>
            </div>
            <div class="content">
                ${firstName ? `<div class="greeting">Hello ${firstName}! 👋</div>` : ''}
                
                <div class="success-icon">🎉</div>
                
                <div class="confirmation-box">
                    <strong>Great news!</strong> Your password has been successfully changed.
                </div>
                
                <div class="message">
                    We just wanted to confirm that you've changed your password. Your TechyJaunt account is now secured with your new password.
                </div>

                <div class="security-notice">
                    <strong>⚠️ Security Notice:</strong><br>
                    If you didn't change your password, please <a href="mailto:support@techyjaunt.com" style="color: #856404; text-decoration: underline;">contact us</a> right away.
                    It's important that you let us know because it helps us prevent unauthorized access to your TechyJaunt account.
                </div>

                <p style="color: #666; margin-top: 30px;">
                    You can now log in to your account using your new password.
                </p>

                <p style="color: #666; font-style: italic; margin-top: 20px;">
                    Need help? Contact our support team at <strong>support@techyjaunt.com</strong>
                </p>
            </div>
            <div class="footer">
                <p>© 2025 TechyJaunt. All rights reserved.</p>
                <p>TechyJaunt - Empowering Learning Through Technology</p>
                <p>This is an automated email, please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

export default resetPasswordTemplate;
