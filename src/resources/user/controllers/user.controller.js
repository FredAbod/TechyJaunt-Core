import User from "../models/user.js";
import CourseService from "../../courses/services/course.service.js";
import { successResMsg, errorResMsg } from "../../../utils/lib/response.js";
import { uploadImage } from "../../../utils/image/cloudinary.js";
import logger from "../../../utils/log/logger.js";
import { passwordHash } from "../../../middleware/hashing.js";
import { sendMail } from "../../../utils/email/email-sender.js";

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
    const studentsPromise = User.find(query)
      .select('-password -emailOtp -resetPasswordToken -resetPasswordExpiry')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const totalCountPromise = User.countDocuments(query);

    const [students, totalStudents] = await Promise.all([studentsPromise, totalCountPromise]);

    // Get enrollment statistics for each student (optimized with fallback)
    let studentsWithStats;
    try {
      studentsWithStats = await Promise.all(
        students.map(async (student) => {
          try {
            // Use a more efficient query to get basic enrollment stats
            const UserCourseProgress = (await import("../../courses/models/userCourseProgress.js")).default;
            
            const enrollmentStats = await UserCourseProgress.aggregate([
              { $match: { userId: student._id } },
              {
                $group: {
                  _id: null,
                  totalCourses: { $sum: 1 },
                  completedCourses: {
                    $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
                  },
                  inProgressCourses: {
                    $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] }
                  },
                  avgProgress: { $avg: "$progress.progressPercentage" }
                }
              }
            ]);

            const stats = enrollmentStats[0] || {
              totalCourses: 0,
              completedCourses: 0,
              inProgressCourses: 0,
              avgProgress: 0
            };

            return {
              ...student.toJSON(),
              enrollmentStats: {
                totalCourses: stats.totalCourses || 0,
                completedCourses: stats.completedCourses || 0,
                inProgressCourses: stats.inProgressCourses || 0,
                overallProgress: Math.round(stats.avgProgress || 0)
              }
            };
          } catch (error) {
            // If stats retrieval fails for this student, return student without stats
            logger.warn(`Failed to get stats for student ${student._id}: ${error.message}`);
            return {
              ...student.toJSON(),
              enrollmentStats: {
                totalCourses: 0,
                completedCourses: 0,
                inProgressCourses: 0,
                overallProgress: 0
              }
            };
          }
        })
      );
    } catch (error) {
      // Fallback: if getting stats fails entirely, return students without stats
      logger.warn(`Failed to get enrollment stats, returning students without stats: ${error.message}`);
      studentsWithStats = students.map(student => ({
        ...student.toJSON(),
        enrollmentStats: {
          totalCourses: 0,
          completedCourses: 0,
          inProgressCourses: 0,
          overallProgress: 0
        }
      }));
    }

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

// Admin endpoint to get specific student by ID
export const getStudentById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { studentId } = req.params;

    // Check if user is admin or super admin
    const currentUser = await User.findById(userId);
    if (!currentUser || !["admin", "super admin"].includes(currentUser.role)) {
      return errorResMsg(res, 403, "Access denied. Admin privileges required.");
    }

    // Find the student
    const student = await User.findById(studentId)
      .select('-password -emailOtp -resetPasswordToken -resetPasswordExpiry');

    if (!student) {
      return errorResMsg(res, 404, "Student not found");
    }

    // Only allow viewing students (users with role 'user')
    if (student.role !== "user") {
      return errorResMsg(res, 403, "Can only view student accounts");
    }

    // Get detailed enrollment statistics
    let studentWithStats;
    try {
      const UserCourseProgress = (await import("../../courses/models/userCourseProgress.js")).default;
      
      const enrollmentStats = await UserCourseProgress.aggregate([
        { $match: { userId: student._id } },
        {
          $group: {
            _id: null,
            totalCourses: { $sum: 1 },
            completedCourses: { 
              $sum: { $cond: [{ $eq: ["$completionStatus", "completed"] }, 1, 0] } 
            },
            inProgressCourses: { 
              $sum: { $cond: [{ $eq: ["$completionStatus", "in-progress"] }, 1, 0] } 
            },
            averageProgress: { $avg: "$progressPercentage" }
          }
        }
      ]);

      const stats = enrollmentStats[0] || {
        totalCourses: 0,
        completedCourses: 0,
        inProgressCourses: 0,
        averageProgress: 0
      };

      // Get detailed course progress
      const courseProgress = await UserCourseProgress.find({ userId: student._id })
        .populate('courseId', 'title description thumbnail category level')
        .sort({ updatedAt: -1 });

      studentWithStats = {
        ...student.toJSON(),
        enrollmentStats: {
          totalCourses: stats.totalCourses,
          completedCourses: stats.completedCourses,
          inProgressCourses: stats.inProgressCourses,
          overallProgress: Math.round(stats.averageProgress || 0)
        },
        courseProgress: courseProgress
      };

    } catch (error) {
      logger.warn(`Failed to get enrollment stats for student ${studentId}: ${error.message}`);
      studentWithStats = {
        ...student.toJSON(),
        enrollmentStats: {
          totalCourses: 0,
          completedCourses: 0,
          inProgressCourses: 0,
          overallProgress: 0
        },
        courseProgress: []
      };
    }

    logger.info(`Admin ${userId} retrieved student details for ${studentId}`);
    return successResMsg(res, 200, {
      message: "Student details retrieved successfully",
      student: studentWithStats
    });

  } catch (error) {
    logger.error(`Get student by ID error: ${error.message}`);
    return errorResMsg(res, 500, "Failed to retrieve student details");
  }
};

// Admin endpoint to invite a new user
export const inviteUser = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { firstName, lastName, email, password, role = 'user' } = req.body;

    // Check admin privileges
    const adminUser = await User.findById(adminId);
    if (!adminUser || !["admin", "super admin"].includes(adminUser.role)) {
      return errorResMsg(res, 403, "Access denied. Admin privileges required.");
    }

    if (!firstName || !lastName || !email || !password) {
      return errorResMsg(res, 400, "Missing required fields: firstName, lastName, email, password");
    }

    // Don't allow creating higher-privilege roles unless super admin
    if (["admin", "super admin"].includes(role) && adminUser.role !== 'super admin') {
      return errorResMsg(res, 403, "Only super admin can invite admin or super admin users.");
    }

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return errorResMsg(res, 409, "A user with that email already exists");
    }

    // Hash password
    const hashed = await passwordHash(password);
    if (!hashed) {
      logger.error('Failed to hash password during invite');
      return errorResMsg(res, 500, "Failed to create user");
    }

    const newUser = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashed,
      role,
      status: 'active',
      emailVerified: true,
      profileCompleted: false
    });

    const saved = await newUser.save();

    // Send invite email with credentials (avoid including raw password in logs)
    try {
      const subject = 'You have been invited to TechyJaunt';
      const text = `Hello ${firstName},\n\nYou have been invited to TechyJaunt. Use the credentials below to login:\nEmail: ${email}\nPassword: ${password}\n\nPlease change your password after first login.`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
          <h2>Hello ${firstName},</h2>
          <p>You have been invited to TechyJaunt. Use the login details below:</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${password}</p>
          <p>Please change your password after first login.</p>
          <p>Best regards,<br/>TechyJaunt Team</p>
        </div>
      `;

      await sendMail(email, subject, text, html);
    } catch (emailErr) {
      logger.warn(`Invite email failed to send to ${email}: ${emailErr.message}`);
      // continue; user was still created
    }

    logger.info(`Admin ${adminId} invited user ${saved._id}`);
    return successResMsg(res, 201, { message: 'User invited successfully', user: saved.toJSON() });

  } catch (error) {
    logger.error(`Invite user error: ${error.message}`);
    return errorResMsg(res, 500, "Failed to invite user");
  }
};
