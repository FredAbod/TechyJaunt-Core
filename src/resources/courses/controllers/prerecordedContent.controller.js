import PrerecordedContentService from "../services/prerecordedContent.service.js";
import { successResMsg, errorResMsg } from "../../../utils/lib/response.js";
import logger from "../../../utils/log/logger.js";

// Upload video class
export const uploadVideoClass = async (req, res) => {
  try {
    const classData = req.body;
    const instructorId = req.user.userId;
    
    if (!req.files || !req.files.video) {
      return errorResMsg(res, 400, "Video file is required");
    }

    const videoFile = req.files.video[0];
    const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

    const videoClass = await PrerecordedContentService.uploadVideoClass(
      classData, 
      videoFile, 
      thumbnailFile, 
      instructorId
    );

    logger.info(`Video class uploaded: ${videoClass.title} by ${instructorId}`);
    return successResMsg(res, 201, { message: "Video class uploaded successfully", videoClass });

  } catch (error) {
    logger.error(`Upload video class error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

// Get video classes for a course
export const getVideoClasses = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.userId;
    const isInstructor = req.user && ["admin", "tutor", "super admin"].includes(req.user.role);

    const videoClasses = await PrerecordedContentService.getVideoClasses(
      courseId, 
      userId, 
      isInstructor
    );

    return successResMsg(res, 200, { message: "Video classes retrieved successfully", videoClasses });

  } catch (error) {
    logger.error(`Get video classes error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

// Get single video class
export const getVideoClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user?.userId;

    const videoClass = await PrerecordedContentService.getVideoClass(classId, userId);

    return successResMsg(res, 200, { message: "Video class retrieved successfully", videoClass });

  } catch (error) {
    logger.error(`Get video class error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

// Update video class
export const updateVideoClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const updateData = req.body;
    const instructorId = req.user.userId;

    const videoClass = await PrerecordedContentService.updateVideoClass(
      classId, 
      updateData, 
      instructorId
    );

    logger.info(`Video class updated: ${classId} by ${instructorId}`);
    return successResMsg(res, 200, { message: "Video class updated successfully", videoClass });

  } catch (error) {
    logger.error(`Update video class error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

// Delete video class
export const deleteVideoClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const instructorId = req.user.userId;

    const result = await PrerecordedContentService.deleteVideoClass(classId, instructorId);

    logger.info(`Video class deleted: ${classId} by ${instructorId}`);
    return successResMsg(res, 200, result.message);

  } catch (error) {
    logger.error(`Delete video class error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

// Upload class resource
export const uploadClassResource = async (req, res) => {
  try {
    const resourceData = req.body;
    const uploadedBy = req.user.userId;
    
    if (!req.file) {
      return errorResMsg(res, 400, "Resource file is required");
    }

    const resource = await PrerecordedContentService.uploadClassResource(
      resourceData, 
      req.file, 
      uploadedBy
    );

    logger.info(`Class resource uploaded: ${resource.title} by ${uploadedBy}`);
    return successResMsg(res, 201, { message: "Class resource uploaded successfully", resource });

  } catch (error) {
    logger.error(`Upload class resource error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

// Get class resources
export const getClassResources = async (req, res) => {
  try {
    const { classId } = req.params;
    const { classType } = req.query;
    const userId = req.user?.userId;

    if (!classType || !["PrerecordedClass", "LiveClass"].includes(classType)) {
      return errorResMsg(res, 400, "Valid classType query parameter is required");
    }

    const resources = await PrerecordedContentService.getClassResources(
      classId, 
      classType, 
      userId
    );

    return successResMsg(res, 200, { message: "Class resources retrieved successfully", resources });

  } catch (error) {
    logger.error(`Get class resources error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

// Download resource
export const downloadResource = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const userId = req.user.userId;

    const downloadData = await PrerecordedContentService.downloadResource(resourceId, userId);

    logger.info(`Resource downloaded: ${resourceId} by ${userId}`);
    
    // Redirect to Cloudinary URL for download
    return res.redirect(downloadData.downloadUrl);

  } catch (error) {
    logger.error(`Download resource error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

// Delete class resource
export const deleteClassResource = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const userId = req.user.userId;

    const result = await PrerecordedContentService.deleteClassResource(resourceId, userId);

    logger.info(`Class resource deleted: ${resourceId} by ${userId}`);
    return successResMsg(res, 200, result.message);

  } catch (error) {
    logger.error(`Delete class resource error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

// Get instructor's video classes
export const getInstructorVideoClasses = async (req, res) => {
  try {
    const instructorId = req.user.userId;

    // This would require a method in the service to get all instructor's videos
    // For now, we can return a placeholder
    return successResMsg(res, 200, { message: "Feature coming soon", videoClasses: [] });

  } catch (error) {
    logger.error(`Get instructor video classes error: ${error.message}`);
    return errorResMsg(res, 500, "Failed to retrieve instructor video classes");
  }
};
