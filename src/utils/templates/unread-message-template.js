const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const unreadMessageTemplate = ({
  recipientName,
  senderName,
  preview,
  inboxUrl,
}) => {
  const safePreview = escapeHtml(preview || "You have a new message.");
  const safeSender = escapeHtml(senderName);
  const safeRecipient = escapeHtml(recipientName);

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New message - TechyJaunt</title>
    <style>
      body { font-family: Arial, sans-serif; color: #333; background: #f4f4f4; }
      .container { max-width: 600px; margin: 0 auto; padding: 24px; background: #fff; border-radius: 10px; }
      .cta { display:inline-block; padding: 12px 22px; background:#3498db; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold; }
      .preview { background:#f8f9fa; padding:16px; border-radius:8px; border-left:4px solid #3498db; margin:16px 0; color:#555; }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>You have a message waiting</h2>
      <p>Hi <strong>${safeRecipient}</strong>,</p>
      <p><strong>${safeSender}</strong> sent you a message on TechyJaunt.</p>
      <div class="preview">${safePreview}</div>
      <p style="text-align:center;margin:28px 0;">
        <a href="${inboxUrl}" class="cta">Open Messages</a>
      </p>
      <p style="font-size:12px;color:#777">This is an automated notification from TechyJaunt. Reply in the app, not this email.</p>
    </div>
  </body>
  </html>
  `;
};

export default unreadMessageTemplate;
