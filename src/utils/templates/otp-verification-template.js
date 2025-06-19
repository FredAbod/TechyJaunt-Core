const otpVerificationTemplate = (firstName, otp) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - TechyJaunt</title>
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
            .button {
                display: inline-block;
                padding: 15px 30px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                border-radius: 25px;
                font-weight: bold;
                margin: 20px 0;
            }
            .footer {
                background-color: #f8f9fa;
                padding: 20px;
                text-align: center;
                color: #666;
                font-size: 14px;
            }
            .warning {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎓 TechyJaunt</h1>
                <p>Your Learning Journey Starts Here</p>
            </div>
            <div class="content">
                <h2>Welcome ${firstName || 'there'}! 👋</h2>
                <p>Thank you for joining TechyJaunt! We're excited to have you on board.</p>
                <p>To complete your registration, please verify your email address using the OTP below:</p>
                
                <div class="otp-box">
                    <p style="margin: 0; color: #666; font-size: 14px;">Your Verification Code</p>
                    <div class="otp-code">${otp}</div>
                    <p style="margin: 0; color: #666; font-size: 12px;">Valid for 10 minutes</p>
                </div>

                <div class="warning">
                    <strong>⚠️ Security Notice:</strong><br>
                    Never share this OTP with anyone. TechyJaunt will never ask for your OTP via phone or email.
                </div>

                <p>If you didn't request this verification, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>© 2025 TechyJaunt. All rights reserved.</p>
                <p>This is an automated email, please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

export default otpVerificationTemplate;
