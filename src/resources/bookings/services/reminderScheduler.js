import cron from "node-cron";
import BookingSession from "../models/bookingSession.js";
import {
  sendSessionReminderStudentEmail,
  sendSessionReminderTutorEmail,
} from "../../../utils/email/email-sender.js";
import { calendarLinksForBooking } from "../../../utils/helper/calendarLinks.js";
import { dashboardSessionUrl } from "../../../utils/helper/frontendUrls.js";
import bookingService from "./booking.service.js";
import logger from "../../../utils/log/logger.js";
import moment from "moment-timezone";

const REMINDER_TARGETS = {
  "1hour": 60,
  "30min": 30,
  "15min": 15,
};

const REMINDER_WINDOWS = {
  "1hour": 8,
  "30min": 6,
  "15min": 5,
};

const FLAG_PATH = {
  "1hour": "sent1hour",
  "30min": "sent30min",
  "15min": "sent15min",
};

const TYPE_LABEL = {
  "1hour": "1 hour",
  "30min": "30 minutes",
  "15min": "15 minutes",
};

function sessionStartMoment(session, now) {
  const timezone = session.timezone || "UTC";
  return moment.tz(
    `${moment(session.sessionDate).format("YYYY-MM-DD")} ${session.startTime}`,
    "YYYY-MM-DD HH:mm",
    timezone,
  );
}

function needsAnyReminder(session, diffMinutes) {
  if (diffMinutes > 70 || diffMinutes < 0) return false;
  for (const type of Object.keys(REMINDER_TARGETS)) {
    const target = REMINDER_TARGETS[type];
    const window = REMINDER_WINDOWS[type] || 5;
    if (diffMinutes <= target && diffMinutes > target - window) {
      const flagPath = FLAG_PATH[type];
      const flags = session.reminders?.[flagPath];
      if (!flags?.student || !flags?.tutor) return true;
    }
  }
  return false;
}

cron.schedule("* * * * *", async () => {
  try {
    logger.info("[ReminderScheduler] running check for upcoming sessions");

    try {
      const marked = await bookingService.markOverdueSessionsAsMissed();
      if (marked) {
        logger.info(`[ReminderScheduler] marked ${marked} session(s) as missed`);
      }
    } catch (err) {
      logger.error("[ReminderScheduler] failed to mark missed sessions", err.message);
    }

    const now = moment();
    const candidates = await BookingSession.find({
      status: "confirmed",
      sessionDate: {
        $gte: now.clone().subtract(1, "day").startOf("day").toDate(),
        $lte: now.clone().add(1, "day").endOf("day").toDate(),
      },
    }).select("sessionDate startTime timezone reminders");

    const dueIds = [];
    for (const session of candidates) {
      const diffMinutes = sessionStartMoment(session, now).diff(now, "minutes");
      if (needsAnyReminder(session, diffMinutes)) {
        dueIds.push(session._id);
      }
    }

    if (!dueIds.length) return;

    const sessions = await BookingSession.find({ _id: { $in: dueIds } }).populate(
      "studentId tutorId",
    );

    for (const session of sessions) {
      try {
        const timezone = session.timezone || "UTC";
        const sessionStart = sessionStartMoment(session, now);
        const diffMinutes = sessionStart.diff(now, "minutes");
        if (diffMinutes > 70 || diffMinutes < 0) continue;

        if (!session.reminders) session.reminders = {};
        for (const flag of Object.values(FLAG_PATH)) {
          if (!session.reminders[flag]) {
            session.reminders[flag] = { student: false, tutor: false };
          }
        }

        const sendReminders = async (type) => {
          const student = session.studentId;
          const tutor = session.tutorId;
          const { googleCalendarUrl } = calendarLinksForBooking(session, {
            otherPartyName: `${tutor.firstName} ${tutor.lastName}`,
            role: "user",
          });

          const sessionDetails = {
            date: moment(session.sessionDate).format("YYYY-MM-DD"),
            startTime: session.startTime,
            endTime: session.endTime,
            duration: session.duration,
            timezone,
            googleCalendarUrl,
            dashboardUrl: dashboardSessionUrl({
              bookingId: session._id,
              role: "user",
            }),
          };

          const flagPath = FLAG_PATH[type];
          const reminderLabel = TYPE_LABEL[type] || type;

          try {
            if (!session.reminders[flagPath]?.student) {
              await sendSessionReminderStudentEmail(
                student.email,
                `${student.firstName} ${student.lastName}`,
                `${tutor.firstName} ${tutor.lastName}`,
                sessionDetails,
                reminderLabel,
              );
              session.reminders[flagPath].student = true;
            }
          } catch (err) {
            logger.error(
              "[ReminderScheduler] failed to send student reminder",
              err.message,
            );
          }

          try {
            if (!session.reminders[flagPath]?.tutor) {
              await sendSessionReminderTutorEmail(
                tutor.email,
                `${tutor.firstName} ${tutor.lastName}`,
                `${student.firstName} ${student.lastName}`,
                {
                  ...sessionDetails,
                  dashboardUrl: dashboardSessionUrl({
                    bookingId: session._id,
                    role: "tutor",
                  }),
                  googleCalendarUrl: calendarLinksForBooking(session, {
                    otherPartyName: `${student.firstName} ${student.lastName}`,
                    role: "tutor",
                  }).googleCalendarUrl,
                },
                reminderLabel,
              );
              session.reminders[flagPath].tutor = true;
            }
          } catch (err) {
            logger.error(
              "[ReminderScheduler] failed to send tutor reminder",
              err.message,
            );
          }

          session.reminders.reminderSentAt = new Date();
          session.markModified("reminders");
          await session.save();
        };

        for (const type of Object.keys(REMINDER_TARGETS)) {
          const target = REMINDER_TARGETS[type];
          const window = REMINDER_WINDOWS[type] || 5;
          if (diffMinutes <= target && diffMinutes > target - window) {
            logger.info(
              `[ReminderScheduler] sending ${type} reminder for session ${session._id} (diffMinutes=${diffMinutes})`,
            );
            await sendReminders(type);
          }
        }
      } catch (err) {
        logger.error("[ReminderScheduler] error processing session", err.message);
      }
    }
  } catch (error) {
    logger.error("[ReminderScheduler] scheduler error", error.message);
  }
});

export default cron;
