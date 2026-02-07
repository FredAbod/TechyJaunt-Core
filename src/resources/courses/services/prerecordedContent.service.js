import PrerecordedClass from "../models/prerecordedClass.js";
import ClassResource from "../models/classResource.js";
import Course from "../models/course.js";
import User from "../../user/models/user.js";
import UserCourseProgress from "../models/userCourseProgress.js";
import {
  uploadVideo,
  uploadImage,
  uploadDocument,
  deleteFile,
  generateThumbnail,
} from "../../../utils/image/s3.js";

class PrerecordedContentService {
  // Determine file type based on mime type
  getFileType(mimeType) {
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("audio/")) return "audio";
    if (
      mimeType.includes("pdf") ||
      mimeType.includes("document") ||
      mimeType.includes("presentation") ||
      mimeType.includes("spreadsheet") ||
      mimeType.includes("text")
    )
      return "document";
    if (mimeType.includes("zip") || mimeType.includes("rar")) return "archive";
    return "other";
  }

  // Upload video class
  async uploadVideoClass(classData, videoFile, thumbnailFile, instructorId) {
    try {
      // Verify instructor permissions
      const instructor = await User.findById(instructorId);
      if (
        !instructor ||
        !["admin", "tutor", "super admin"].includes(instructor.role)
      ) {
        throw new Error("Only admins and tutors can upload video classes");
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
        throw new Error("You can only upload videos for your own courses");
      }

      // Upload video to Cloudinary
      console.log("Uploading video to Cloudinary...");
      const videoResult = await uploadVideo(videoFile.buffer, {
        folder: `techyjaunt/courses/${course._id}/videos`,
        public_id: `video_${Date.now()}`,
        eager: [
          { quality: "auto:good", format: "mp4" },
          { quality: "auto:low", format: "mp4" },
        ],
      });

      // Upload thumbnail if provided, otherwise generate from video
      let thumbnailResult;
      if (thumbnailFile) {
        console.log("Uploading custom thumbnail...");
        thumbnailResult = await uploadImage(thumbnailFile.buffer, {
          folder: `techyjaunt/courses/${course._id}/thumbnails`,
          public_id: `thumb_${Date.now()}`,
        });
      } else {
        console.log("Generating thumbnail from video...");
        const thumbnailUrl = await generateThumbnail(videoResult.public_id);
        thumbnailResult = { url: thumbnailUrl, public_id: null };
      }

      // Create pre-recorded class record
      const prerecordedClass = new PrerecordedClass({
        ...classData,
        instructor: instructorId,
        video: {
          url: videoResult.secure_url,
          publicId: videoResult.public_id,
          duration: videoResult.duration,
          size: videoResult.bytes,
          format: videoResult.format,
          quality: "auto",
        },
        thumbnail: {
          url: thumbnailResult.url,
          publicId: thumbnailResult.public_id,
        },
        processingStatus: "ready",
      });

      await prerecordedClass.save();

      // Update course with new video count (optional)
      // You could add a videoCount field to Course model

      return await PrerecordedClass.findById(prerecordedClass._id)
        .populate("courseId", "title category")
        .populate("instructor", "firstName lastName");
    } catch (error) {
      throw error;
    }
  }

  // Get video classes for a course
  async getVideoClasses(courseId, userId = null, isInstructor = false) {
    try {
      const query = {
        courseId,
        isActive: true,
      };

      // If not instructor, only show published videos
      if (!isInstructor) {
        query.isPublished = true;
      }

      const videoClasses = await PrerecordedClass.find(query)
        .populate("instructor", "firstName lastName")
        .sort({ order: 1, createdAt: 1 });

      // If user is provided, check their progress for each video
      if (userId) {
        const userProgress = await UserCourseProgress.findOne({
          userId,
          courseId,
        });

        if (userProgress) {
          const videoClassesWithProgress = videoClasses.map((video) => {
            const videoObj = video.toObject();
            const completed = userProgress.progress.completedLessons.find(
              (lesson) => lesson.lessonId.toString() === video._id.toString(),
            );
            videoObj.isCompleted = !!completed;
            videoObj.completedAt = completed?.completedAt;
            videoObj.timeSpent = completed?.timeSpent || 0;
            return videoObj;
          });
          return videoClassesWithProgress;
        }
      }

      return videoClasses;
    } catch (error) {
      throw error;
    }
  }

  // Get single video class
  async getVideoClass(classId, userId = null) {
    try {
      const videoClass = await PrerecordedClass.findById(classId)
        .populate("courseId", "title category")
        .populate("moduleId", "title order")
        .populate("instructor", "firstName lastName");

      if (!videoClass) {
        throw new Error("Video class not found");
      }

      // Check if user has access
      if (userId && !videoClass.isPublished) {
        const instructor = await User.findById(userId);
        if (
          !instructor ||
          !["admin", "tutor", "super admin"].includes(instructor.role)
        ) {
          throw new Error("Video class not available");
        }
      }

      // If video is part of a module, check module access for students
      if (userId && videoClass.moduleId) {
        const user = await User.findById(userId);

        // Skip access check for admins and tutors
        if (!user || !["admin", "tutor", "super admin"].includes(user.role)) {
          try {
            // Import progress service dynamically to avoid circular dependencies
            const progressService = (await import("./progress.service.js"))
              .default;

            const moduleAccess = await progressService.getModuleAccess(
              userId,
              videoClass.courseId._id,
              videoClass.moduleId._id,
            );

            if (!moduleAccess.canAccess) {
              throw new Error(
                "You don't have access to this module yet. Complete the previous module first.",
              );
            }
          } catch (accessError) {
            // If there's no progress record, user might not have an active subscription
            if (accessError.message.includes("Progress not found")) {
              throw new Error(
                "You need an active subscription to access this content.",
              );
            }
            throw accessError;
          }
        }
      }

      // Increment view count
      videoClass.viewCount += 1;
      await videoClass.save();

      return videoClass;
    } catch (error) {
      throw error;
    }
  }

  // Update video class
  async updateVideoClass(classId, updateData, instructorId) {
    try {
      const videoClass = await PrerecordedClass.findById(classId);

      if (!videoClass) {
        throw new Error("Video class not found");
      }

      const instructor = await User.findById(instructorId);
      if (
        videoClass.instructor.toString() !== instructorId &&
        instructor.role !== "super admin"
      ) {
        throw new Error("You can only update your own video classes");
      }

      Object.assign(videoClass, updateData);

      if (updateData.isPublished && !videoClass.publishedAt) {
        videoClass.publishedAt = new Date();
      }

      await videoClass.save();

      return await PrerecordedClass.findById(classId)
        .populate("courseId", "title")
        .populate("instructor", "firstName lastName");
    } catch (error) {
      throw error;
    }
  }

  // Delete video class
  async deleteVideoClass(classId, instructorId) {
    try {
      const videoClass = await PrerecordedClass.findById(classId);

      if (!videoClass) {
        throw new Error("Video class not found");
      }

      const instructor = await User.findById(instructorId);
      if (
        videoClass.instructor.toString() !== instructorId &&
        instructor.role !== "super admin"
      ) {
        throw new Error("You can only delete your own video classes");
      }

      // Delete video from Cloudinary
      if (videoClass.video.publicId) {
        await deleteFile(videoClass.video.publicId, "video");
      }

      // Delete thumbnail from Cloudinary if it was uploaded separately
      if (videoClass.thumbnail.publicId) {
        await deleteFile(videoClass.thumbnail.publicId, "image");
      }

      // Delete associated resources
      const resources = await ClassResource.find({
        classId: classId,
        classType: "PrerecordedClass",
      });

      for (const resource of resources) {
        if (resource.file.publicId) {
          const resourceType = this.getFileType(resource.file.mimeType);
          await deleteFile(
            resource.file.publicId,
            resourceType === "video"
              ? "video"
              : resourceType === "image"
                ? "image"
                : "raw",
          );
        }
        await ClassResource.findByIdAndDelete(resource._id);
      }

      await PrerecordedClass.findByIdAndDelete(classId);

      return { message: "Video class deleted successfully" };
    } catch (error) {
      throw error;
    }
  }

  // Upload class resource
  async uploadClassResource(resourceData, file, uploadedBy) {
    try {
      // Verify user permissions
      const user = await User.findById(uploadedBy);
      if (!user || !["admin", "tutor", "super admin"].includes(user.role)) {
        throw new Error("Only admins and tutors can upload class resources");
      }

      // Verify course and class exist
      const course = await Course.findById(resourceData.courseId);
      if (!course) {
        throw new Error("Course not found");
      }

      // Verify class exists (could be PrerecordedClass or LiveClass)
      let classExists;
      if (resourceData.classType === "PrerecordedClass") {
        classExists = await PrerecordedClass.findById(resourceData.classId);
      } else {
        // Import LiveClass model when needed
        const LiveClass = (
          await import("../../live-classes/models/liveClass.js")
        ).default;
        classExists = await LiveClass.findById(resourceData.classId);
      }

      if (!classExists) {
        throw new Error("Class not found");
      }

      // Determine file type and upload accordingly
      const fileType = this.getFileType(file.mimetype);
      let uploadResult;

      const uploadOptions = {
        folder: `techyjaunt/courses/${course._id}/resources`,
        public_id: `resource_${Date.now()}`,
        resource_type:
          fileType === "video"
            ? "video"
            : fileType === "image"
              ? "image"
              : "raw",
      };

      if (fileType === "video") {
        uploadResult = await uploadVideo(file.buffer, uploadOptions);
      } else if (fileType === "image") {
        uploadResult = await uploadImage(file.buffer, uploadOptions);
      } else {
        uploadResult = await uploadDocument(file.buffer, uploadOptions);
      }

      // Create resource record
      const resource = new ClassResource({
        ...resourceData,
        uploadedBy,
        file: {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          originalName: file.originalname,
          size: file.size,
          format: uploadResult.format,
          mimeType: file.mimetype,
        },
        type: fileType,
      });

      await resource.save();

      return await ClassResource.findById(resource._id)
        .populate("uploadedBy", "firstName lastName")
        .populate("courseId", "title");
    } catch (error) {
      throw error;
    }
  }

  // Get class resources
  async getClassResources(classId, classType, userId = null) {
    try {
      const query = {
        classId,
        classType,
        isActive: true,
      };

      const resources = await ClassResource.find(query)
        .populate("uploadedBy", "firstName lastName")
        .sort({ createdAt: -1 });

      // Check access level for each resource
      if (userId) {
        const filteredResources = [];

        for (const resource of resources) {
          if (resource.accessLevel === "free") {
            filteredResources.push(resource);
          } else if (resource.accessLevel === "enrolled_only") {
            // Check if user is enrolled in the course
            const enrollment = await UserCourseProgress.findOne({
              userId,
              courseId: resource.courseId,
            });
            if (enrollment) {
              filteredResources.push(resource);
            }
          }
          // Premium resources might need additional logic
        }

        return filteredResources;
      }

      return resources;
    } catch (error) {
      throw error;
    }
  }

  // Download resource (increment download count)
  async downloadResource(resourceId, userId) {
    try {
      const resource = await ClassResource.findById(resourceId);

      if (!resource) {
        throw new Error("Resource not found");
      }

      // Check access permissions
      if (resource.accessLevel === "enrolled_only") {
        const enrollment = await UserCourseProgress.findOne({
          userId,
          courseId: resource.courseId,
        });
        if (!enrollment) {
          throw new Error(
            "You must be enrolled in this course to download this resource",
          );
        }
      }

      // Increment download count
      resource.downloadCount += 1;
      await resource.save();

      return {
        downloadUrl: resource.file.url,
        filename: resource.file.originalName,
      };
    } catch (error) {
      throw error;
    }
  }

  // Delete class resource
  async deleteClassResource(resourceId, userId) {
    try {
      const resource = await ClassResource.findById(resourceId);

      if (!resource) {
        throw new Error("Resource not found");
      }

      const user = await User.findById(userId);
      if (
        resource.uploadedBy.toString() !== userId &&
        user.role !== "super admin"
      ) {
        throw new Error("You can only delete resources you uploaded");
      }

      // Delete file from Cloudinary
      if (resource.file.publicId) {
        const resourceType = this.getFileType(resource.file.mimeType);
        await deleteFile(
          resource.file.publicId,
          resourceType === "video"
            ? "video"
            : resourceType === "image"
              ? "image"
              : "raw",
        );
      }

      await ClassResource.findByIdAndDelete(resourceId);

      return { message: "Resource deleted successfully" };
    } catch (error) {
      throw error;
    }
  }
}

export default new PrerecordedContentService();
