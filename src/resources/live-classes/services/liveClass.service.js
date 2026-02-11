import LiveClass from "../models/liveClass.js";
import ClassComment from "../models/classComment.js";
import ClassNotification from "../models/classNotification.js";
import Course from "../../courses/models/course.js";
import Progress from "../../courses/models/progress.js";
import User from "../../user/models/user.js";
import { v4 as uuidv4 } from "uuid";
import logger from "../../../utils/log/logger.js";

class LiveClassService {
  // Generate a unique meeting room ID
  generateRoomId() {
    return `room_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  // Generate Jitsi Meet URL (free alternative to Google Meet)
  generateJitsiMeetUrl(roomId) {
    return `https://meet.jit.si/${roomId}`;
  }

  // Schedule a new live class
  async scheduleLiveClass(classData, instructorId) {
    try {
      // Verify instructor permissions
      const instructor = await User.findById(instructorId);
      if (
        !instructor ||
        !["admin", "tutor", "super admin"].includes(instructor.role)
      ) {
        throw new Error("Only admins and tutors can schedule live classes");
      }

      // Verify course exists and instructor has access
      const course = await Course.findById(classData.courseId);
      if (!course) {
        throw new Error("Course not found");
      }

      if (
        course.instructor.toString() !== instructorId &&
        instructor.role !== "super admin"
      ) {
        throw new Error("You can only schedule classes for your own courses");
      }

      // Generate meeting room details
      const roomId = this.generateRoomId();
      const joinUrl = this.generateJitsiMeetUrl(roomId);

      const liveClass = new LiveClass({
        ...classData,
        instructor: instructorId,
        meetingRoom: {
          roomId,
          joinUrl,
          password: Math.random().toString(36).substring(2, 8), // 6-character password
        },
      });

      await liveClass.save();

      // Get all enrolled students for the course
      const enrolledStudents = await Progress.find({
        courseId: classData.courseId,
      }).populate("userId");

      // Create notifications for all enrolled students
      if (enrolledStudents.length > 0) {
        const notification = new ClassNotification({
          liveClassId: liveClass._id,
          type: "class_scheduled",
          title: `New Live Class: ${liveClass.title}`,
          message: `A new live class "${liveClass.title}" has been scheduled for ${new Date(liveClass.scheduledDate).toLocaleString()}. Course: ${course.title}`,
          recipients: enrolledStudents.map((progress) => ({
            userId: progress.userId._id,
          })),
          scheduledFor: new Date(Date.now() + 1000), // Send immediately
        });

        await notification.save();

        // Create reminder notification (1 hour before class)
        const reminderTime = new Date(
          liveClass.scheduledDate.getTime() - 60 * 60 * 1000,
        );
        if (reminderTime > new Date()) {
          const reminderNotification = new ClassNotification({
            liveClassId: liveClass._id,
            type: "class_reminder",
            title: `Class Reminder: ${liveClass.title}`,
            message: `Your live class "${liveClass.title}" starts in 1 hour. Click to join when it's time!`,
            recipients: enrolledStudents.map((progress) => ({
              userId: progress.userId._id,
            })),
            scheduledFor: reminderTime,
          });

          await reminderNotification.save();
        }
      }

      return await LiveClass.findById(liveClass._id)
        .populate("courseId", "title")
        .populate("instructor", "firstName lastName email");
    } catch (error) {
      throw error;
    }
  }

  // Get live classes for instructor
  async getInstructorClasses(instructorId, status = null) {
    try {
      const query = { instructor: instructorId };
      if (status) {
        query.status = status;
      }

      const classes = await LiveClass.find(query)
        .populate("courseId", "title category")
        .populate("instructor", "firstName lastName")
        .sort({ scheduledDate: -1 });

      return classes;
    } catch (error) {
      throw error;
    }
  }

  // Get live classes for student
  async getStudentClasses(userId, status = null) {
    try {
      logger.info(
        `Getting student classes for user: ${userId}, status: ${status}`,
      );

      // Get user's enrolled courses
      const enrolledCourses = await Progress.find({ userId }).select(
        "courseId",
      );

      logger.info(
        `Found ${enrolledCourses.length} enrolled courses for user ${userId}`,
      );

      const courseIds = enrolledCourses.map((course) => course.courseId);
      logger.info(`Course IDs: ${courseIds.map((id) => id.toString())}`);

      const query = {
        courseId: { $in: courseIds },
        isActive: true,
      };

      if (status) {
        query.status = status;
      }

      logger.info(`Query: ${JSON.stringify(query)}`);

      const classes = await LiveClass.find(query)
        .populate("courseId", "title category")
        .populate("instructor", "firstName lastName")
        .sort({ scheduledDate: -1 });

      logger.info(`Found ${classes.length} classes matching query`);

      return classes;
    } catch (error) {
      logger.error(`getStudentClasses error: ${error.message}`);
      throw error;
    }
  }

  // Start a live class
  async startLiveClass(classId, instructorId) {
    try {
      const liveClass = await LiveClass.findById(classId);

      if (!liveClass) {
        throw new Error("Live class not found");
      }

      if (liveClass.instructor.toString() !== instructorId) {
        throw new Error("Only the instructor can start this class");
      }

      if (liveClass.status !== "scheduled") {
        throw new Error("Class is not scheduled or already started");
      }

      liveClass.status = "live";
      await liveClass.save();

      // Notify enrolled students that class has started
      const enrolledStudents = await Progress.find({
        courseId: liveClass.courseId,
      });

      if (enrolledStudents.length > 0) {
        const notification = new ClassNotification({
          liveClassId: liveClass._id,
          type: "class_started",
          title: `Live Class Started: ${liveClass.title}`,
          message: `The live class "${liveClass.title}" has started. Join now!`,
          recipients: enrolledStudents.map((progress) => ({
            userId: progress.userId,
          })),
          scheduledFor: new Date(),
        });

        await notification.save();
      }

      return liveClass;
    } catch (error) {
      throw error;
    }
  }

  // End a live class
  async endLiveClass(classId, instructorId) {
    try {
      const liveClass = await LiveClass.findById(classId);

      if (!liveClass) {
        throw new Error("Live class not found");
      }

      if (liveClass.instructor.toString() !== instructorId) {
        throw new Error("Only the instructor can end this class");
      }

      if (liveClass.status !== "live") {
        throw new Error("Class is not currently live");
      }

      // Mark all participants as left
      liveClass.participants = liveClass.participants.map((participant) => ({
        ...participant,
        leftAt: participant.leftAt || new Date(),
      }));

      liveClass.status = "completed";
      await liveClass.save();

      return liveClass;
    } catch (error) {
      throw error;
    }
  }

  // Join a live class
  async joinLiveClass(classId, userId) {
    try {
      const liveClass = await LiveClass.findById(classId).populate("courseId");

      if (!liveClass) {
        throw new Error("Live class not found");
      }

      if (liveClass.status !== "live") {
        throw new Error("Class is not currently live");
      }

      // Check if user is enrolled in the course
      const enrollment = await Progress.findOne({
        userId,
        courseId: liveClass.courseId._id,
      });

      if (!enrollment) {
        throw new Error(
          "You must be enrolled in this course to join the class",
        );
      }

      // Check if already joined
      const alreadyJoined = liveClass.participants.find(
        (p) => p.userId.toString() === userId && !p.leftAt,
      );

      if (alreadyJoined) {
        return {
          joinUrl: liveClass.meetingRoom.joinUrl,
          password: liveClass.meetingRoom.password,
          message: "Already joined",
        };
      }

      // Add participant
      liveClass.participants.push({
        userId,
        joinedAt: new Date(),
      });

      await liveClass.save();

      return {
        joinUrl: liveClass.meetingRoom.joinUrl,
        password: liveClass.meetingRoom.password,
        message: "Joined successfully",
      };
    } catch (error) {
      throw error;
    }
  }

  // Leave a live class
  async leaveLiveClass(classId, userId) {
    try {
      const liveClass = await LiveClass.findById(classId);

      if (!liveClass) {
        throw new Error("Live class not found");
      }

      // Find participant and mark as left
      const participantIndex = liveClass.participants.findIndex(
        (p) => p.userId.toString() === userId && !p.leftAt,
      );

      if (participantIndex !== -1) {
        liveClass.participants[participantIndex].leftAt = new Date();
        await liveClass.save();
      }

      return { message: "Left class successfully" };
    } catch (error) {
      throw error;
    }
  }

  // Add comment during live class
  async addComment(classId, userId, commentData) {
    try {
      const liveClass = await LiveClass.findById(classId);

      if (!liveClass) {
        throw new Error("Live class not found");
      }

      if (liveClass.status !== "live") {
        throw new Error("Can only comment during live classes");
      }

      // Check if user is a participant or instructor
      const isParticipant = liveClass.participants.some(
        (p) => p.userId.toString() === userId && !p.leftAt,
      );
      const isInstructor = liveClass.instructor.toString() === userId;

      if (!isParticipant && !isInstructor) {
        throw new Error("You must be participating in the class to comment");
      }

      const comment = new ClassComment({
        liveClassId: classId,
        userId,
        message: commentData.message,
        replyTo: commentData.replyTo || null,
      });

      await comment.save();

      return await ClassComment.findById(comment._id)
        .populate("userId", "firstName lastName")
        .populate("replyTo");
    } catch (error) {
      throw error;
    }
  }

  // Get comments for a live class
  async getClassComments(classId, userId) {
    try {
      const liveClass = await LiveClass.findById(classId);

      if (!liveClass) {
        throw new Error("Live class not found");
      }

      // Check if user has access to view comments
      const isParticipant = liveClass.participants.some(
        (p) => p.userId.toString() === userId,
      );
      const isInstructor = liveClass.instructor.toString() === userId;

      // Check if user is enrolled in the course
      const enrollment = await Progress.findOne({
        userId,
        courseId: liveClass.courseId,
      });

      if (!isParticipant && !isInstructor && !enrollment) {
        throw new Error("Access denied");
      }

      const comments = await ClassComment.find({
        liveClassId: classId,
        isVisible: true,
      })
        .populate("userId", "firstName lastName")
        .populate("replyTo")
        .sort({ timestamp: 1 });

      return comments;
    } catch (error) {
      throw error;
    }
  }

  // Update live class
  async updateLiveClass(classId, updateData, instructorId) {
    try {
      const liveClass = await LiveClass.findById(classId);

      if (!liveClass) {
        throw new Error("Live class not found");
      }

      if (liveClass.instructor.toString() !== instructorId) {
        throw new Error("Only the instructor can update this class");
      }

      if (liveClass.status === "live") {
        throw new Error("Cannot update class while it's live");
      }

      Object.assign(liveClass, updateData);
      await liveClass.save();

      return await LiveClass.findById(classId)
        .populate("courseId", "title")
        .populate("instructor", "firstName lastName");
    } catch (error) {
      throw error;
    }
  }

  // Delete/Cancel live class
  async cancelLiveClass(classId, instructorId) {
    try {
      const liveClass = await LiveClass.findById(classId);

      if (!liveClass) {
        throw new Error("Live class not found");
      }

      if (liveClass.instructor.toString() !== instructorId) {
        throw new Error("Only the instructor can cancel this class");
      }

      if (liveClass.status === "live") {
        throw new Error("Cannot cancel class while it's live. End it first.");
      }

      liveClass.status = "cancelled";
      await liveClass.save();

      // Notify enrolled students about cancellation
      const enrolledStudents = await Progress.find({
        courseId: liveClass.courseId,
      });

      if (enrolledStudents.length > 0) {
        const notification = new ClassNotification({
          liveClassId: liveClass._id,
          type: "class_cancelled",
          title: `Class Cancelled: ${liveClass.title}`,
          message: `The live class "${liveClass.title}" scheduled for ${new Date(liveClass.scheduledDate).toLocaleString()} has been cancelled.`,
          recipients: enrolledStudents.map((progress) => ({
            userId: progress.userId,
          })),
          scheduledFor: new Date(),
        });

        await notification.save();
      }

      return liveClass;
    } catch (error) {
      throw error;
    }
  }
}

export default new LiveClassService();
