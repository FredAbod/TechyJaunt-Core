import cron from 'node-cron';
import BookingSession from '../models/bookingSession.js';
import User from '../../user/models/user.js';
import { 
  sendSessionBookingStudentEmail,
  sendSessionBookingTutorEmail,
  sendSessionReminderStudentEmail,
  sendSessionReminderTutorEmail,
} from '../../../utils/email/email-sender.js';
import logger from '../../../utils/log/logger.js';
import moment from 'moment-timezone';

// Runs every minute to check for upcoming sessions and send reminders
cron.schedule('* * * * *', async () => {
  try {
    logger.info('[ReminderScheduler] running check for upcoming sessions');

    // Find confirmed sessions in the next 2 days
    const now = moment();
    const twoDaysAhead = now.clone().add(2, 'days').endOf('day');

    const sessions = await BookingSession.find({
      status: 'confirmed',
      sessionDate: { $gte: now.toDate(), $lte: twoDaysAhead.toDate() }
    }).populate('studentId tutorId');

    for (const session of sessions) {
      try {
        const timezone = session.timezone || 'UTC';
        const sessionStart = moment.tz(
          moment(session.sessionDate).format('YYYY-MM-DD') + ' ' + session.startTime,
          'YYYY-MM-DD HH:mm',
          timezone
        );

        const diffMinutes = sessionStart.diff(now, 'minutes');

        // Helper to send reminders and update flags (respects per-reminder flags)
        const sendReminders = async (type) => {
          const student = session.studentId;
          const tutor = session.tutorId;
          const sessionDetails = {
            date: moment(session.sessionDate).format('YYYY-MM-DD'),
            startTime: session.startTime,
            endTime: session.endTime,
            meetingUrl: session.meetingDetails?.meetingUrl || session.meetingDetails?.meetingId || ''
          };

          // Map internal type to readable label
          const typeLabelMap = {
            '2days': '2 days',
            '1day': '1 day',
            '1hour': '1 hour',
            '10min': '10 minutes'
          };

          const reminderLabel = typeLabelMap[type] || type;

          // Decide which flags to check/update
          const flagPath = {
            '2days': 'sent2days',
            '1day': 'sent1day',
            '1hour': 'sent1hour',
            '10min': 'sent10min'
          }[type];

          if (!flagPath) return;

          // send to student if not already sent
          try {
            if (!session.reminders[flagPath]?.student) {
              await sendSessionReminderStudentEmail(student.email, `${student.firstName} ${student.lastName}`, `${tutor.firstName} ${tutor.lastName}`, sessionDetails, reminderLabel);
              session.reminders[flagPath].student = true;
            }
          } catch (err) {
            logger.error('[ReminderScheduler] failed to send student reminder', err.message);
          }

          // send to tutor if not already sent
          try {
            if (!session.reminders[flagPath]?.tutor) {
              await sendSessionReminderTutorEmail(tutor.email, `${tutor.firstName} ${tutor.lastName}`, `${student.firstName} ${student.lastName}`, sessionDetails, reminderLabel);
              session.reminders[flagPath].tutor = true;
            }
          } catch (err) {
            logger.error('[ReminderScheduler] failed to send tutor reminder', err.message);
          }

          session.reminders.reminderSentAt = new Date();
          await session.save();
        };

        // Use target minutes + tolerance window so reminders are resilient to short downtime
        const reminderTargets = {
          '2days': 2880,
          '1day': 1440,
          '1hour': 60,
          '10min': 10
        };

        // Windows (in minutes) for each target — adjust to tolerate short outages
        const reminderWindows = {
          '2days': 60,   // 1 hour window around the 2-day mark
          '1day': 30,    // 30 minutes for 1-day
          '1hour': 10,   // 10 minutes for 1-hour
          '10min': 2     // 2 minutes for 10-min
        };

        for (const type of Object.keys(reminderTargets)) {
          const target = reminderTargets[type];
          const window = reminderWindows[type] || 5;

          // Send if we're within (target - window, target] minutes before the session
          if (diffMinutes <= target && diffMinutes > (target - window)) {
            logger.info(`[ReminderScheduler] sending ${type} reminder for session ${session._id} (diffMinutes=${diffMinutes})`);
            await sendReminders(type);
          }
        }

      } catch (err) {
        logger.error('[ReminderScheduler] error processing session', err.message);
      }
    }

  } catch (error) {
    logger.error('[ReminderScheduler] scheduler error', error.message);
  }
});

export default cron;
