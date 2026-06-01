import { SUBSCRIPTION_PERKS_HTML } from "./subscription-perks-snippet.js";

const subscriptionPaymentSuccessTemplate = ({
  firstName,
  planName,
  courseTitle,
}) => {
  const name = firstName || "there";
  const plan = planName || "your plan";
  const course = courseTitle
    ? `<p>You now have <strong>lifetime access</strong> to <strong>${courseTitle}</strong>. AI tutor and live session booking stay active for your current subscription period—renew anytime to extend those.</p>`
    : `<p>Your payment was successful. Course content stays available after your billing period ends; renew to keep using the AI tutor and booking sessions.</p>`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment confirmed — TechyJaunt</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 32px 20px; text-align: center; }
        .content { padding: 32px 28px; color: #333; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-weight: 300;">Payment confirmed</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>Thank you for subscribing to <strong>${plan}</strong> on TechyJaunt.</p>
          ${course}
          ${SUBSCRIPTION_PERKS_HTML}
          <p style="color: #666; font-size: 14px;">Questions? Reply to this email or contact <strong>support@techyjaunt.com</strong>.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} TechyJaunt. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export default subscriptionPaymentSuccessTemplate;
