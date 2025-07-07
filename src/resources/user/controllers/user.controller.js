import User from "../models/user.js";
import CourseService from "../../courses/services/course.service.js";
import { successResMsg, errorResMsg } from "../../../utils/lib/response.js";
import { uploadImage } from "../../../utils/image/cloudinary.js";
import logger from "../../../utils/log/logger.js";

// Helper function to check if profile is complete
const isProfileComplete = (user) => {
  return !!(user.firstName && user.lastName && user.phone);
};

export const addProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const profileData = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return errorResMsg(res, 404, "User not found");
    }

    // Check if profile is already completed
    if (user.profileCompleted) {
      return errorResMsg(res, 400, "Profile already completed. Use update profile endpoint.");
    }

    // Update user with profile data
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        ...profileData,
        profileCompleted: isProfileComplete({ ...user.toObject(), ...profileData })
      },
      { new: true, runValidators: true }
    );    logger.info(`Profile completed for user: ${user.email}`);
    return successResMsg(res, 200, {
      message: "Profile completed successfully",
      user: updatedUser.toJSON()
    });

  } catch (error) {
    logger.error(`Add profile error: ${error.message}`);
    return errorResMsg(res, 500, "Failed to complete profile");
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return errorResMsg(res, 404, "User not found");
    }    return successResMsg(res, 200, {
      message: "Profile retrieved successfully",
      user: user.toJSON()
    });

  } catch (error) {
    logger.error(`Get profile error: ${error.message}`);
    return errorResMsg(res, 500, "Failed to retrieve profile");
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updateData.email;
    delete updateData.password;
    delete updateData.role;
    delete updateData.emailVerified;
    delete updateData.status;

    // Get current user data to check profile completion
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return errorResMsg(res, 404, "User not found");
    }

    // Check if profile will be complete after update
    const mergedData = { ...currentUser.toObject(), ...updateData };
    updateData.profileCompleted = isProfileComplete(mergedData);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return errorResMsg(res, 500, "Failed to update user");
    }    logger.info(`Profile updated for user: ${updatedUser.email}`);
    return successResMsg(res, 200, {
      message: "Profile updated successfully",
      user: updatedUser.toJSON()
    });

  } catch (error) {
    logger.error(`Update profile error: ${error.message}`);
    return errorResMsg(res, 500, "Failed to update profile");
  }
};

export const getDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return errorResMsg(res, 404, "User not found");
    }

    // Get course dashboard data
    const courseDashboard = await CourseService.getUserDashboard(userId);

    const dashboardData = {
      user: user.toJSON(),
      ...courseDashboard,
      notifications: [],
      upcomingClasses: [],
    };

    return successResMsg(res, 200, {
      message: "Dashboard data retrieved successfully",
      ...dashboardData
    });

  } catch (error) {
    logger.error(`Get dashboard error: ${error.message}`);
    return errorResMsg(res, 500, "Failed to retrieve dashboard data");
  }
};

export const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return errorResMsg(res, 404, "User not found");
    }

    // Get course dashboard data
    const courseDashboard = await CourseService.getUserDashboard(userId);

    const dashboardData = {
      user: user.toJSON(),
      ...courseDashboard,
      notifications: [],
      upcomingClasses: [],
    };

    return successResMsg(res, 200, {
      message: "Dashboard data retrieved successfully",
      ...dashboardData
    });

  } catch (error) {
    logger.error(`Get dashboard error: ${error.message}`);
    return errorResMsg(res, 500, "Failed to retrieve dashboard data");
  }
};

// Development endpoint to promote user role (remove in production)
export const promoteUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.user.userId;

    if (!["admin", "super admin", "tutor"].includes(role)) {
      return errorResMsg(res, 400, "Invalid role. Use: admin, super admin, or tutor");
    }

    const user = await User.findByIdAndUpdate(
      userId, 
      { role }, 
      { new: true }
    ).select('-password -__v');

    logger.info(`User role updated: ${userId} to ${role}`);
    return successResMsg(res, 200, { 
      message: `Role updated to ${role} successfully`, 
      user 
    });

  } catch (error) {
    logger.error(`Promote user error: ${error.message}`);
    return errorResMsg(res, 500, "Failed to update user role");
  }
};

// Profile picture upload
export const uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!req.file) {
      return errorResMsg(res, 400, "No profile picture file provided");
    }

    // Upload image to Cloudinary
    const uploadResult = await uploadImage(req.file.buffer, {
      folder: "techyjaunt/profile-pictures",
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto:good" },
        { fetch_format: "auto" }
      ],
      public_id: `profile_${userId}_${Date.now()}`
    });

    // Update user profile with new picture URL
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        profilePic: uploadResult.secure_url,
        profilePicPublicId: uploadResult.public_id // Store for deletion if needed
      },
      { new: true }
    ).select('-password -__v');

    if (!user) {
      return errorResMsg(res, 404, "User not found");
    }

    logger.info(`Profile picture uploaded for user: ${userId}`);
    return successResMsg(res, 200, {
      message: "Profile picture uploaded successfully",
      profilePic: uploadResult.secure_url,
      user: user
    });

  } catch (error) {
    logger.error(`Upload profile picture error: ${error.message}`);
    return errorResMsg(res, 500, "Failed to upload profile picture");
  }
};

// Update profile with profile picture
export const updateProfileWithPicture = async (req, res) => {
  try {
    const userId = req.user.userId;
    const profileData = req.body;

    // If there's a file, upload it to Cloudinary
    if (req.file) {
      const uploadResult = await uploadImage(req.file.buffer, {
        folder: "techyjaunt/profile-pictures",
        transformation: [
          { width: 400, height: 400, crop: "fill", gravity: "face" },
          { quality: "auto:good" },
          { fetch_format: "auto" }
        ],
        public_id: `profile_${userId}_${Date.now()}`
      });

      profileData.profilePic = uploadResult.secure_url;
      profileData.profilePicPublicId = uploadResult.public_id;
    }

    // Get current user data to check profile completion
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return errorResMsg(res, 404, "User not found");
    }

    // Check if profile will be complete after update
    const mergedData = { ...currentUser.toObject(), ...profileData };
    profileData.profileCompleted = isProfileComplete(mergedData);

    const user = await User.findByIdAndUpdate(
      userId,
      profileData,
      { new: true, runValidators: true }
    ).select('-password -__v');

    if (!user) {
      return errorResMsg(res, 404, "User not found");
    }

    logger.info(`Profile updated with picture for user: ${userId}`);
    return successResMsg(res, 200, {
      message: "Profile updated successfully",
      user: user
    });

  } catch (error) {
    console.log(error);
    logger.error(`Update profile with picture error: ${error.message}`);
    if (error.name === 'ValidationError') {
      return errorResMsg(res, 400, error.message);
    }
    return errorResMsg(res, 500, "Failed to update profile");
  }
};

// Admin endpoint to get all students
export const getAllStudents = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, search, status } = req.query;

    // Check if user is admin or super admin
    const currentUser = await User.findById(userId);
    if (!currentUser || !["admin", "super admin"].includes(currentUser.role)) {
      return errorResMsg(res, 403, "Access denied. Admin privileges required.");
    }

    // Build query for students
    const query = { role: "user" };
    
    // Add search functionality
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    // Add status filter
    if (status) {
      query.status = status;
    }

    // Execute query with pagination
    const students = await User.find(query)
      .select('-password -emailOtp -resetPasswordToken -resetPasswordExpiry')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const totalStudents = await User.countDocuments(query);

    // Get enrollment statistics for each student
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        const enrolledCourses = await CourseService.getUserDashboard(student._id);
        return {
          ...student.toJSON(),
          enrollmentStats: {
            totalCourses: enrolledCourses.stats?.totalCourses || 0,
            completedCourses: enrolledCourses.stats?.completedCourses || 0,
            inProgressCourses: enrolledCourses.stats?.inProgressCourses || 0,
            overallProgress: enrolledCourses.stats?.overallProgress || 0
          }
        };
      })
    );

    const pagination = {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalStudents / limit),
      totalStudents,
      hasNext: page < Math.ceil(totalStudents / limit),
      hasPrev: page > 1
    };

    logger.info(`Admin ${userId} retrieved students list`);
    return successResMsg(res, 200, {
      message: "Students retrieved successfully",
      students: studentsWithStats,
      pagination
    });

  } catch (error) {
    logger.error(`Get all students error: ${error.message}`);
    return errorResMsg(res, 500, "Failed to retrieve students");
  }
};
