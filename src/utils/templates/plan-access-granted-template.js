import { SUBSCRIPTION_PERKS_HTML } from "./subscription-perks-snippet.js";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Email sent when an admin grants a plan.
 * When `credentials` is provided the account was just provisioned and the
 * email carries the temporary password.
 */
const planAccessGrantedTemplate = ({
  firstName,
  planName,
  courseTitle,
  accessEndsAt,
  loginUrl,
  credentials = null,
}) => {
  const name = escapeHtml(firstName || "there");
  const plan = escapeHtml(planName || "a TechyJaunt plan");
  const course = courseTitle
    ? ` for <strong>${escapeHtml(courseTitle)}</strong>`
    : "";
  const period = accessEndsAt
    ? `<p>Your plan benefits are active until <strong>${escapeHtml(
        new Date(accessEndsAt).toDateString(),
      )}</strong>.</p>`
    : "";

  const credentialsBlock = credentials
    ? `
          <p>We've created a TechyJaunt account for you. Use these details to sign in:</p>
          <div style="background:#f8f9fa; border-radius:8px; padding:16px 20px; margin:16px 0;">
            <p style="margin:4px 0;"><strong>Email:</strong> ${escapeHtml(credentials.email)}</p>
            <p style="margin:4px 0;"><strong>Temporary password:</strong>
              <code style="font-size:16px; background:#fff; padding:2px 6px; border-radius:4px;">${escapeHtml(credentials.temporaryPassword)}</code>
            </p>
          </div>
          <p>This temporary password expires in <strong>${escapeHtml(
            credentials.expiresInDays,
          )} days</strong>. Please change it after you sign in. If it expires, use "Forgot password" on the login page.</p>`
    : "";

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You've been given access — TechyJaunt</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 32px 20px; text-align: center; }
        .content { padding: 32px 28px; color: #333; }
        .button { display: inline-block; background: #667eea; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-weight: 300;">You've been given access</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>You now have access to the <strong>${plan}</strong> plan${course} on TechyJaunt.</p>
          ${period}
          ${credentialsBlock}
          <p style="text-align:center; margin: 28px 0;">
            <a class="button" href="${escapeHtml(loginUrl)}">Sign in to TechyJaunt</a>
          </p>
          ${SUBSCRIPTION_PERKS_HTML}
          <p style="color: #666; font-size: 14px;">If you weren't expecting this, you can ignore this email or contact <strong>support@techyjaunt.com</strong>.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} TechyJaunt. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export default planAccessGrantedTemplate;
