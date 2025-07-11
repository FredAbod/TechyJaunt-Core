import LiveClassService from "../services/liveClass.service.js";
import { successResMsg, errorResMsg } from "../../../utils/lib/response.js";
import logger from "../../../utils/log/logger.js";

// Schedule live class (Admin/Tutor)
export const scheduleLiveClass = async (req, res) => {
  try {
    const classData = req.body;
    const instructorId = req.user.userId;

    const liveClass = await LiveClassService.scheduleLiveClass(classData, instructorId);

    logger.info(`Live class scheduled: ${liveClass.title} by ${instructorId}`);
    return successResMsg(res, 201, { message: "Live class scheduled successfully", liveClass });

  } catch (error) {
    logger.error(`Schedule live class error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

// Get instructor's live classes
export const getInstructorClasses = async (req, res) => {
  try {
    const instructorId = req.user.userId;
    const { status } = req.query;

    const classes = await LiveClassService.getInstructorClasses(instructorId, status);

    return successResMsg(res, 200, { message: "Instructor classes retrieved successfully", classes });

  } catch (error) {
    logger.error(`Get instructor classes error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

// Get student's live classes
export const getStudentClasses = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, limit, page } = req.query;

    logger.info(`Getting student classes for user: ${userId}, status: ${status}, limit: ${limit}, page: ${page}`);

    const classes = await LiveClassService.getStudentClasses(userId, status);

    logger.info(`Found ${classes.length} classes for student ${userId}`);

    return successResMsg(res, 200, { message: "Student classes retrieved successfully", classes });

  } catch (error) {
    logger.error(`Get student classes error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

// Start live class
export const startLiveClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const instructorId = req.user.userId;

    const liveClass = await LiveClassService.startLiveClass(classId, instructorId);

    logger.info(`Live class started: ${classId} by ${instructorId}`);
    return successResMsg(res, 200, { message: "Live class started successfully", liveClass });

  } catch (error) {
    logger.error(`Start live class error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

// End live class
export const endLiveClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const instructorId = req.user.userId;

    const liveClass = await LiveClassService.endLiveClass(classId, instructorId);

    logger.info(`Live class ended: ${classId} by ${instructorId}`);
    return successResMsg(res, 200, { message: "Live class ended successfully", liveClass });

  } catch (error) {
    logger.error(`End live class error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

// Join live class
export const joinLiveClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user.userId;

    const joinData = await LiveClassService.joinLiveClass(classId, userId);

    logger.info(`User joined live class: ${classId} by ${userId}`);
    return successResMsg(res, 200, { 
      message: joinData.message,
      joinUrl: joinData.joinUrl,
      password: joinData.password 
    });

  } catch (error) {
    logger.error(`Join live class error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

// Leave live class
export const leaveLiveClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user.userId;

    const result = await LiveClassService.leaveLiveClass(classId, userId);

    return successResMsg(res, 200, { message: result.message });

  } catch (error) {
    logger.error(`Leave live class error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

// Add comment during live class
export const addComment = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user.userId;
    const commentData = req.body;

    const comment = await LiveClassService.addComment(classId, userId, commentData);

    return successResMsg(res, 201, { message: "Comment added successfully", comment });

  } catch (error) {
    logger.error(`Add comment error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

// Get class comments
export const getClassComments = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user.userId;

    const comments = await LiveClassService.getClassComments(classId, userId);

    return successResMsg(res, 200, { message: "Comments retrieved successfully", comments });

  } catch (error) {
    logger.error(`Get class comments error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

// Update live class
export const updateLiveClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const updateData = req.body;
    const instructorId = req.user.userId;

    const liveClass = await LiveClassService.updateLiveClass(classId, updateData, instructorId);

    logger.info(`Live class updated: ${classId} by ${instructorId}`);
    return successResMsg(res, 200, { message: "Live class updated successfully", liveClass });

  } catch (error) {
    logger.error(`Update live class error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

// Cancel live class
export const cancelLiveClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const instructorId = req.user.userId;

    const liveClass = await LiveClassService.cancelLiveClass(classId, instructorId);

    logger.info(`Live class cancelled: ${classId} by ${instructorId}`);
    return successResMsg(res, 200, { message: "Live class cancelled successfully", liveClass });

  } catch (error) {
    logger.error(`Cancel live class error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};
