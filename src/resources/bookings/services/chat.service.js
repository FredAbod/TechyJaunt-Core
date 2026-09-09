import Conversation from "../models/tutorStudentConversation.js";
import Message from "../models/tutorStudentMessage.js";
import BookingSession from "../models/bookingSession.js";
import Course from "../../courses/models/course.js";
import User from "../../user/models/user.js";
import Subscription from "../../payments/models/subscription.js";
import { sendUnreadMessageEmail } from "../../../utils/email/email-sender.js";
import {
  studentMessagesUrl,
  tutorMessagesUrl,
} from "../../../utils/helper/frontendUrls.js";
import logger from "../../../utils/log/logger.js";

const TUTOR_ROLES = ["tutor", "admin", "super admin"];
const MAX_BODY = 2000;
const MESSAGE_EMAIL_COOLDOWN_MS = 15 * 60 * 1000;
const CHAT_BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "no_show",
];

function isTutorRole(role) {
  return TUTOR_ROLES.includes(role);
}

function pairIds(userId, role, otherUserId) {
  if (isTutorRole(role)) {
    return { studentId: otherUserId, tutorId: userId };
  }
  return { studentId: userId, tutorId: otherUserId };
}

async function assertCanChat(userId, role, otherUserId) {
  if (!otherUserId) {
    const error = new Error("The other participant is required");
    error.statusCode = 400;
    throw error;
  }

  if (userId.toString() === otherUserId.toString()) {
    const error = new Error("You cannot message yourself");
    error.statusCode = 400;
    throw error;
  }

  const { studentId, tutorId } = pairIds(userId, role, otherUserId);

  const other = await User.findById(otherUserId).select("role firstName lastName");
  if (!other) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const booking = await BookingSession.findOne({
    studentId,
    tutorId,
    status: { $in: CHAT_BOOKING_STATUSES },
  }).select("_id");

  if (booking) return { studentId, tutorId };

  const tutorCourses = await Course.find({
    $or: [{ instructor: tutorId }, { assistants: tutorId }],
  }).select("_id");
  const courseIds = tutorCourses.map((c) => c._id);

  if (courseIds.length) {
    const now = new Date();
    const subscription = await Subscription.findOne({
      user: studentId,
      courseId: { $in: courseIds },
      status: "active",
      "featureAccess.mentorship.hasAccess": true,
      $or: [
        { "featureAccess.mentorship.expiresAt": { $gte: now } },
        { "featureAccess.mentorship.expiresAt": null },
      ],
    }).select("_id");

    if (subscription) return { studentId, tutorId };
  }

  const error = new Error(
    "You can only message tutors and students you share a mentorship booking or course with",
  );
  error.statusCode = 403;
  throw error;
}

function assertParticipant(conversation, userId) {
  const id = userId.toString();
  const isStudent = conversation.studentId.toString() === id;
  const isTutor = conversation.tutorId.toString() === id;
  if (!isStudent && !isTutor) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }
}

async function notifyRecipientOfNewMessage(conversation, senderId, preview) {
  try {
    const senderIsTutor =
      conversation.tutorId.toString() === senderId.toString();
    const notifyField = senderIsTutor
      ? "studentLastNotifiedAt"
      : "tutorLastNotifiedAt";
    const lastNotified = conversation[notifyField];
    if (
      lastNotified &&
      Date.now() - new Date(lastNotified).getTime() < MESSAGE_EMAIL_COOLDOWN_MS
    ) {
      return;
    }

    const [student, tutor] = await Promise.all([
      User.findById(conversation.studentId).select("firstName lastName email"),
      User.findById(conversation.tutorId).select("firstName lastName email"),
    ]);
    if (!student?.email || !tutor?.email) return;

    const sender = senderIsTutor ? tutor : student;
    const recipient = senderIsTutor ? student : tutor;
    const senderName = `${sender.firstName || ""} ${sender.lastName || ""}`.trim() || "Someone";
    const recipientName = `${recipient.firstName || ""} ${recipient.lastName || ""}`.trim() || "there";
    const inboxUrl = senderIsTutor
      ? studentMessagesUrl({ withUserId: tutor._id.toString() })
      : tutorMessagesUrl({ withUserId: student._id.toString() });

    const sent = await sendUnreadMessageEmail({
      recipientEmail: recipient.email,
      recipientName,
      senderName,
      preview: (preview || "").slice(0, 160),
      inboxUrl,
    });

    if (sent) {
      conversation[notifyField] = new Date();
      await conversation.save();
    }
  } catch (error) {
    logger.error("Failed to send unread message email", {
      error: error.message,
      conversationId: conversation?._id,
    });
  }
}

const chatService = {
  async listContacts(userId, role) {
    if (isTutorRole(role)) {
      const bookings = await BookingSession.find({
        tutorId: userId,
        status: { $in: CHAT_BOOKING_STATUSES },
      })
        .populate("studentId", "firstName lastName email profilePic")
        .sort({ updatedAt: -1 });

      const seen = new Map();
      for (const booking of bookings) {
        const student = booking.studentId;
        if (!student?._id) continue;
        const id = student._id.toString();
        if (!seen.has(id)) {
          seen.set(id, {
            _id: student._id,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            profilePic: student.profilePic,
            role: "student",
          });
        }
      }
      return Array.from(seen.values());
    }

    const bookings = await BookingSession.find({
      studentId: userId,
      status: { $in: CHAT_BOOKING_STATUSES },
    })
      .populate("tutorId", "firstName lastName email profilePic")
      .sort({ updatedAt: -1 });

    const seen = new Map();
    for (const booking of bookings) {
      const tutor = booking.tutorId;
      if (!tutor?._id) continue;
      const id = tutor._id.toString();
      if (!seen.has(id)) {
        seen.set(id, {
          _id: tutor._id,
          firstName: tutor.firstName,
          lastName: tutor.lastName,
          email: tutor.email,
          profilePic: tutor.profilePic,
          role: "tutor",
        });
      }
    }

    const now = new Date();
    const subs = await Subscription.find({
      user: userId,
      status: "active",
      "featureAccess.mentorship.hasAccess": true,
      $or: [
        { "featureAccess.mentorship.expiresAt": { $gte: now } },
        { "featureAccess.mentorship.expiresAt": null },
      ],
    }).select("courseId");

    const courseIds = subs.map((s) => s.courseId);
    if (courseIds.length) {
      const courses = await Course.find({
        _id: { $in: courseIds },
      }).select("instructor assistants");

      const tutorIds = new Set();
      courses.forEach((course) => {
        if (course.instructor) tutorIds.add(course.instructor.toString());
        (course.assistants || []).forEach((assistant) => {
          const id = assistant?._id || assistant;
          if (id) tutorIds.add(id.toString());
        });
      });

      const extraTutors = await User.find({
        _id: { $in: Array.from(tutorIds) },
      }).select("firstName lastName email profilePic role");

      extraTutors.forEach((tutor) => {
        const id = tutor._id.toString();
        if (!seen.has(id)) {
          seen.set(id, {
            _id: tutor._id,
            firstName: tutor.firstName,
            lastName: tutor.lastName,
            email: tutor.email,
            profilePic: tutor.profilePic,
            role: "tutor",
          });
        }
      });
    }

    return Array.from(seen.values());
  },

  async listConversations(userId, role) {
    const filter = isTutorRole(role)
      ? { tutorId: userId }
      : { studentId: userId };

    const conversations = await Conversation.find(filter)
      .populate("studentId", "firstName lastName email profilePic")
      .populate("tutorId", "firstName lastName email profilePic")
      .sort({ lastMessageAt: -1 });

    const withUnread = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conversation._id,
          senderId: { $ne: userId },
          readAt: null,
        });
        const other = isTutorRole(role)
          ? conversation.studentId
          : conversation.tutorId;
        return {
          _id: conversation._id,
          studentId: conversation.studentId,
          tutorId: conversation.tutorId,
          otherParticipant: other,
          lastMessageAt: conversation.lastMessageAt,
          lastMessagePreview: conversation.lastMessagePreview,
          unreadCount,
        };
      }),
    );

    return withUnread;
  },

  async getOrCreateConversation(userId, role, { tutorId, studentId }) {
    const otherUserId = isTutorRole(role) ? studentId : tutorId;
    const pair = await assertCanChat(userId, role, otherUserId);

    let conversation = await Conversation.findOne({
      studentId: pair.studentId,
      tutorId: pair.tutorId,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        studentId: pair.studentId,
        tutorId: pair.tutorId,
        lastMessageAt: new Date(),
      });
    }

    return Conversation.findById(conversation._id)
      .populate("studentId", "firstName lastName email profilePic")
      .populate("tutorId", "firstName lastName email profilePic");
  },

  async listMessages(userId, conversationId, { after, limit = 50 } = {}) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      const error = new Error("Conversation not found");
      error.statusCode = 404;
      throw error;
    }
    assertParticipant(conversation, userId);

    const query = { conversationId };
    if (after) {
      query.createdAt = { $gt: new Date(after) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .limit(Math.min(Number(limit) || 50, 100))
      .populate("senderId", "firstName lastName profilePic role");

    await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: userId },
        readAt: null,
      },
      { $set: { readAt: new Date() } },
    );

    return messages;
  },

  async sendMessage(userId, conversationId, body) {
    const text = String(body || "").trim();
    if (!text) {
      const error = new Error("Message cannot be empty");
      error.statusCode = 400;
      throw error;
    }
    if (text.length > MAX_BODY) {
      const error = new Error(`Message cannot exceed ${MAX_BODY} characters`);
      error.statusCode = 400;
      throw error;
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      const error = new Error("Conversation not found");
      error.statusCode = 404;
      throw error;
    }
    assertParticipant(conversation, userId);

    const message = await Message.create({
      conversationId,
      senderId: userId,
      body: text,
    });

    conversation.lastMessageAt = message.createdAt;
    conversation.lastMessagePreview = text.slice(0, 200);
    await conversation.save();

    await notifyRecipientOfNewMessage(conversation, userId, text);

    return Message.findById(message._id).populate(
      "senderId",
      "firstName lastName profilePic role",
    );
  },
};

export default chatService;
