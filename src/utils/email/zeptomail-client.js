import { SendMailClient } from "zeptomail";
import logger from "../log/logger.js";

const DEFAULT_API_URL = "api.zeptomail.com/";

let client = null;

function getZeptoMailConfig() {
  const token = process.env.ZEPTOMAIL_API_TOKEN;
  if (!token) {
    throw new Error(
      "ZEPTOMAIL_API_TOKEN is not set. Add your ZeptoMail send mail token to .env",
    );
  }

  const fromAddress =
    process.env.ZEPTOMAIL_FROM_ADDRESS ||
    process.env.EMAIL_NODEMAILER ||
    "noreply@techyjaunt.com";

  const fromName =
    process.env.ZEPTOMAIL_FROM_NAME || "TechyJaunt Learning Platform";

  return {
    url: process.env.ZEPTOMAIL_API_URL || DEFAULT_API_URL,
    token,
    fromAddress,
    fromName,
  };
}

function getClient() {
  if (!client) {
    const { url, token } = getZeptoMailConfig();
    client = new SendMailClient({ url, token });
  }
  return client;
}

/**
 * Send a transactional email via ZeptoMail (Zoho).
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} [params.toName] - Recipient display name
 * @param {string} params.subject
 * @param {string} [params.html] - HTML body
 * @param {string} [params.text] - Plain text body
 * @param {string} [params.fromName] - Override default from name
 */
export async function sendZeptoEmail({
  to,
  toName = "",
  subject,
  html,
  text,
  fromName,
}) {
  const { fromAddress, fromName: defaultFromName } = getZeptoMailConfig();

  if (!html && !text) {
    throw new Error("Email requires html or text body");
  }

  const payload = {
    from: {
      address: fromAddress,
      name: fromName || defaultFromName,
    },
    to: [
      {
        email_address: {
          address: to,
          name: toName || to.split("@")[0] || "User",
        },
      },
    ],
    subject,
  };

  if (html) payload.htmlbody = html;
  if (text) payload.textbody = text;
  if (!html && text) {
    payload.htmlbody = `<div style="font-family: Arial, sans-serif;">${text.replace(/\n/g, "<br>")}</div>`;
  }

  const mailClient = getClient();
  const response = await mailClient.sendMail(payload);

  logger.info("ZeptoMail email sent", {
    to,
    subject,
    requestId: response?.data?.request_id || response?.request_id,
  });

  return response;
}

export function resetZeptoMailClient() {
  client = null;
}
