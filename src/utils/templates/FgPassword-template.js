const fgPasswordTemplate = (OTP, firstName = "") => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - TechyJaunt</title>
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
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
            .message {
                color: #666;
                margin-bottom: 30px;
                line-height: 1.6;
            }
            .otp-box {
                background-color: #f8f9fa;
                border: 2px dashed #667eea;
                border-radius: 10px;
                padding: 30px;
                margin: 30px 0;
            }
            .otp-code {
                font-size: 36px;
                font-weight: bold;
                color: #667eea;
                letter-spacing: 8px;
                margin: 10px 0;
            }
            .otp-label {
                color: #666;
                font-size: 14px;
                margin-bottom: 10px;
            }
            .otp-validity {
                color: #999;
                font-size: 12px;
                margin-top: 10px;
            }
            .warning {
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
                .otp-code {
                    font-size: 28px;
                    letter-spacing: 4px;
                }
                .otp-box {
                    padding: 20px;
                }
            }
            
            @media screen and (max-width: 480px) {
                .header h1 {
                    font-size: 20px;
                }
                .content {
                    padding: 20px 15px;
                }
                .otp-code {
                    font-size: 24px;
                    letter-spacing: 2px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Reset Your Password</h1>
                <p>TechyJaunt Learning Platform</p>
            </div>
            <div class="content">
                ${firstName ? `<div class="greeting">Hello ${firstName}! 👋</div>` : ''}
                <div class="message">
                    You're receiving this email because you've requested to reset your password. 
                    To proceed with the password reset, please enter the following One-Time Password (OTP) 
                    within the next <strong>15 minutes</strong>.
                </div>
                
                <div class="otp-box">
                    <div class="otp-label">Your Reset Code</div>
                    <div class="otp-code">${OTP}</div>
                    <div class="otp-validity">Valid for 15 minutes</div>
                </div>

                <div class="warning">
                    <strong>⚠️ Security Notice:</strong><br>
                    If you didn't request this password reset, please ignore this email and your password will remain unchanged.
                    Never share this code with anyone.
                </div>

                <p style="color: #666; font-style: italic; margin-top: 30px;">
                    Having trouble? Contact our support team at <strong>support@techyjaunt.com</strong>
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

export default fgPasswordTemplate;
