import axios from "axios";
import logger from "../log/logger.js";
import {
  SENDER_API_TOKEN,
  SENDER_GROUP_IDS,
  SENDER_TRIGGER_AUTOMATION,
} from "../helper/config.js";

const SENDER_BASE_URL = "https://api.sender.net/v2";

const senderClient = axios.create({
  baseURL: SENDER_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(SENDER_API_TOKEN ? { Authorization: `Bearer ${SENDER_API_TOKEN}` } : {}),
  },
});

function parseGroupIds(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function shouldTriggerAutomation() {
  const raw = String(SENDER_TRIGGER_AUTOMATION ?? "true")
    .trim()
    .toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "no";
}

class SenderService {
  enabled() {
    return Boolean(SENDER_API_TOKEN);
  }

  async updateSubscriber(identifier, { firstName, lastName, phone } = {}) {
    if (!this.enabled()) return { skipped: true };
    if (!identifier) return { skipped: true };

    const payload = {
      ...(typeof firstName === "string" ? { firstname: firstName } : {}),
      ...(typeof lastName === "string" ? { lastname: lastName } : {}),
      ...(phone ? { phone } : {}),
      trigger_automation: shouldTriggerAutomation(),
    };

    // Nothing to update
    if (Object.keys(payload).length === 1) {
      return { skipped: true };
    }

    try {
      const res = await senderClient.patch(`/subscribers/${encodeURIComponent(identifier)}`, payload);
      if (res?.data?.success) {
        logger.info(`Sender subscriber updated: ${identifier}`);
      }
      return res.data;
    } catch (error) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message || error?.message || "Sender updateSubscriber failed";
      logger.warn(`Sender updateSubscriber failed (${status || "no-status"}): ${message}`);
      return { error: true, status, message };
    }
  }

  async createSubscriber({ email, firstName, lastName, phone }) {
    if (!this.enabled()) return { skipped: true };

    const groups = parseGroupIds(SENDER_GROUP_IDS);
    const payload = {
      email,
      firstname: firstName,
      lastname: lastName,
      ...(phone ? { phone } : {}),
      ...(groups.length ? { groups } : {}),
      trigger_automation: shouldTriggerAutomation(),
    };

    try {
      const res = await senderClient.post("/subscribers", payload);
      if (res?.data?.success) {
        logger.info(`Sender subscriber upserted: ${email}`, {
          trigger_automation: payload.trigger_automation,
          groups,
        });
      }
      return res.data;
    } catch (error) {
      // Sender returns 4xx for duplicates; we don't want signup to fail.
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message || error?.message || "Sender createSubscriber failed";

      logger.warn(`Sender createSubscriber failed (${status || "no-status"}): ${message}`);
      return { error: true, status, message };
    }
  }

  async addSubscriberToGroups(email, groupIds = parseGroupIds(SENDER_GROUP_IDS)) {
    if (!this.enabled()) return { skipped: true };
    if (!email) return { skipped: true };
    if (!groupIds || groupIds.length === 0) return { skipped: true };

    const results = [];
    for (const groupId of groupIds) {
      try {
        const res = await senderClient.post(`/subscribers/groups/${groupId}`, {
          subscribers: [email],
          trigger_automation: shouldTriggerAutomation(),
        });
        if (res?.data?.success) {
          logger.info(`Sender group added: ${email} -> ${groupId}`, {
            trigger_automation: shouldTriggerAutomation(),
          });
        }
        results.push({ groupId, ok: true, data: res.data });
      } catch (error) {
        const status = error?.response?.status;
        const message =
          error?.response?.data?.message || error?.message || "Sender addGroup failed";
        logger.warn(
          `Sender addSubscriberToGroup failed (${status || "no-status"}) group=${groupId}: ${message}`,
        );
        results.push({ groupId, ok: false, status, message });
      }
    }

    return { results };
  }
}

export default new SenderService();

