const welcomeOnboardingTemplate = (firstName) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to TechyJaunt - Let's Get Started!</title>
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
            }
            .welcome-message {
                text-align: center;
                margin-bottom: 30px;
            }
            .feature-list {
                background-color: #f8f9fa;
                border-radius: 10px;
                padding: 25px;
                margin: 25px 0;
            }
            .feature-item {
                display: flex;
                align-items: center;
                margin: 15px 0;
                padding: 10px;
            }
            .feature-icon {
                font-size: 24px;
                margin-right: 15px;
                width: 40px;
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
                text-align: center;
            }
            .footer {
                background-color: #f8f9fa;
                padding: 20px;
                text-align: center;
                color: #666;
                font-size: 14px;
            }
            .cta-section {
                text-align: center;
                background-color: #f8f9fa;
                padding: 30px;
                border-radius: 10px;
                margin: 25px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎓 Welcome to TechyJaunt!</h1>
                <p>Your Learning Adventure Begins Now</p>
            </div>
            <div class="content">
                <div class="welcome-message">
                    <h2>Hello ${firstName}! 🌟</h2>
                    <p>Congratulations on joining TechyJaunt! You've just taken the first step towards transforming your career with cutting-edge tech skills.</p>
                </div>

                <div class="feature-list">
                    <h3 style="text-align: center; color: #333; margin-bottom: 20px;">What's waiting for you:</h3>
                    
                    <div class="feature-item">
                        <div class="feature-icon">📚</div>
                        <div>
                            <strong>Comprehensive Courses</strong><br>
                            <span style="color: #666;">Expert-designed curriculum covering the latest technologies</span>
                        </div>
                    </div>
                    
                    <div class="feature-item">
                        <div class="feature-icon">🎥</div>
                        <div>
                            <strong>Live & Recorded Classes</strong><br>
                            <span style="color: #666;">Interactive live sessions and on-demand video content</span>
                        </div>
                    </div>
                    
                    <div class="feature-item">
                        <div class="feature-icon">👨‍🏫</div>
                        <div>
                            <strong>Expert Mentorship</strong><br>
                            <span style="color: #666;">One-on-one sessions with industry professionals</span>
                        </div>
                    </div>
                    
                    <div class="feature-item">
                        <div class="feature-icon">📊</div>
                        <div>
                            <strong>Progress Tracking</strong><br>
                            <span style="color: #666;">Monitor your learning journey with detailed analytics</span>
                        </div>
                    </div>
                    
                    <div class="feature-item">
                        <div class="feature-icon">🏆</div>
                        <div>
                            <strong>Certificates & Projects</strong><br>
                            <span style="color: #666;">Build a portfolio with real-world projects</span>
                        </div>
                    </div>
                </div>

                <div class="cta-section">
                    <h3>Ready to Start Learning? 🚀</h3>
                    <p>Complete your profile to unlock all features and get personalized course recommendations.</p>
                    <a href="#" class="button">Complete Your Profile</a>
                </div>

                <p style="text-align: center; color: #666; font-style: italic;">
                    "The best time to plant a tree was 20 years ago. The second best time is now." - Chinese Proverb
                </p>
            </div>
            <div class="footer">
                <p>© 2025 TechyJaunt. All rights reserved.</p>
                <p>Need help? Contact us at <strong>support@techyjaunt.com</strong></p>
            </div>
        </div>
    </body>
    </html>
  `;
};

export default welcomeOnboardingTemplate;
