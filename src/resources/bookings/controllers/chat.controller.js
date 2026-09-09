import chatService from "../services/chat.service.js";
import { successResMsg, errorResMsg } from "../../../utils/lib/response.js";
import logger from "../../../utils/log/logger.js";

const listContacts = async (req, res) => {
  try {
    const contacts = await chatService.listContacts(req.user.userId, req.user.role);
    return successResMsg(res, 200, {
      message: "Contacts retrieved successfully",
      data: contacts,
    });
  } catch (error) {
    logger.error("Error listing chat contacts:", error);
    return errorResMsg(res, error.statusCode || 500, error.message);
  }
};

const listConversations = async (req, res) => {
  try {
    const conversations = await chatService.listConversations(
      req.user.userId,
      req.user.role,
    );
    return successResMsg(res, 200, {
      message: "Conversations retrieved successfully",
      data: conversations,
    });
  } catch (error) {
    logger.error("Error listing conversations:", error);
    return errorResMsg(res, error.statusCode || 500, error.message);
  }
};

const getOrCreateConversation = async (req, res) => {
  try {
    const conversation = await chatService.getOrCreateConversation(
      req.user.userId,
      req.user.role,
      req.body || {},
    );
    return successResMsg(res, 200, {
      message: "Conversation ready",
      data: conversation,
    });
  } catch (error) {
    logger.error("Error creating conversation:", error);
    return errorResMsg(res, error.statusCode || 500, error.message);
  }
};

const listMessages = async (req, res) => {
  try {
    const messages = await chatService.listMessages(
      req.user.userId,
      req.params.conversationId,
      { after: req.query.after, limit: req.query.limit },
    );
    return successResMsg(res, 200, {
      message: "Messages retrieved successfully",
      data: messages,
    });
  } catch (error) {
    logger.error("Error listing messages:", error);
    return errorResMsg(res, error.statusCode || 500, error.message);
  }
};

const sendMessage = async (req, res) => {
  try {
    const message = await chatService.sendMessage(
      req.user.userId,
      req.params.conversationId,
      req.body?.body,
    );
    return successResMsg(res, 201, {
      message: "Message sent",
      data: message,
    });
  } catch (error) {
    logger.error("Error sending message:", error);
    return errorResMsg(res, error.statusCode || 500, error.message);
  }
};

export {
  listContacts,
  listConversations,
  getOrCreateConversation,
  listMessages,
  sendMessage,
};
