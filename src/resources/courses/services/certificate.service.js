import Certificate from "../models/certificate.js";
import Progress from "../models/progress.js";
import Course from "../models/course.js";
import User from "../../user/models/user.js";
import Subscription from "../../payments/models/subscription.js";
import AppError from "../../../utils/lib/appError.js";
import { generateRandomString } from "../../../utils/helper/helper.js";
import logger from "../../../utils/log/logger.js";
import { createCanvas, registerFont } from "canvas";
import { uploadImage } from "../../../utils/image/cloudinary.js";

class CertificateService {
  /**
   * Check if user is eligible for certificate
   */
  async checkEligibility(userId, courseId) {
    try {
      console.log('=== CHECK ELIGIBILITY START ===');
      console.log('userId:', userId, 'courseId:', courseId);
      
      // Check if user has completed the course
      const progress = await Progress.findOne({
        userId,
        courseId,
        isCompleted: true
      });

      console.log('Progress query result:', progress ? {
        id: progress._id,
        isCompleted: progress.isCompleted,
        overallProgress: progress.overallProgress,
        completedAt: progress.completedAt,
        modulesCount: progress.modules?.length
      } : 'No progress found with isCompleted: true');
      
      // Also check if there's any progress at all
      if (!progress) {
        const anyProgress = await Progress.findOne({ userId, courseId });
        console.log('Any progress for user/course:', anyProgress ? {
          id: anyProgress._id,
          isCompleted: anyProgress.isCompleted,
          overallProgress: anyProgress.overallProgress,
          completedAt: anyProgress.completedAt,
          modulesCount: anyProgress.modules?.length,
          modulesCompleted: anyProgress.modules?.filter(m => m.isCompleted).length
        } : 'No progress at all');
      }

      if (!progress) {
        return {
          eligible: false,
          reason: "Course not completed. You must complete all modules and assessments to receive a certificate."
        };
      }

      // Check if user has active subscription with certificate access
      const subscription = await Subscription.findOne({
        user: userId,
        courseId,
        status: 'active',
        'featureAccess.certificate.hasAccess': true
      });

      if (!subscription) {
        return {
          eligible: false,
          reason: "Certificate access not available. Please upgrade to Bronze or Gold plan to receive a certificate."
        };
      }

      // Check if certificate already exists - return it but still allow regeneration
      const existingCertificate = await Certificate.findOne({
        userId,
        courseId,
        status: 'active'
      });

      if (existingCertificate) {
        return {
          eligible: true,
          reason: "You can regenerate your certificate",
          existingCertificate,
          progress,
          subscription
        };
      }

      return {
        eligible: true,
        progress,
        subscription
      };
    } catch (error) {
      throw new AppError(error.message || "Failed to check certificate eligibility", 500);
    }
  }

  /**
   * Generate certificate number
   */
  generateCertificateNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = generateRandomString(8).toUpperCase();
    return `TJ-${year}${month}-${random}`;
  }

  /**
   * Generate verification code
   */
  generateVerificationCode() {
    return generateRandomString(16).toUpperCase();
  }

  /**
   * Generate temporary certificate image
   */
  async generateCertificateImage(certificateData) {
    try {
      const { studentName, courseTitle, issueDate, certificateNumber, completionDate } = certificateData;

      // Create canvas (A4 landscape size: 297mm x 210mm at 96 DPI)
      const width = 1122; // 297mm * 96/25.4
      const height = 794; // 210mm * 96/25.4
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#1e3a8a'); // Dark blue
      gradient.addColorStop(1, '#3b82f6'); // Light blue
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Border
      ctx.strokeStyle = '#fbbf24'; // Gold
      ctx.lineWidth = 10;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      // Inner border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, width - 80, height - 80);

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('CERTIFICATE OF COMPLETION', width / 2, 120);

      // Decorative line
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 200, 140);
      ctx.lineTo(width / 2 + 200, 140);
      ctx.stroke();

      // "This is to certify that"
      ctx.fillStyle = '#e5e7eb';
      ctx.font = '24px Arial';
      ctx.fillText('This is to certify that', width / 2, 200);

      // Student name
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 56px Arial';
      ctx.fillText(studentName, width / 2, 270);

      // Underline for name
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      const nameWidth = ctx.measureText(studentName).width;
      ctx.beginPath();
      ctx.moveTo(width / 2 - nameWidth / 2, 280);
      ctx.lineTo(width / 2 + nameWidth / 2, 280);
      ctx.stroke();

      // "has successfully completed"
      ctx.fillStyle = '#e5e7eb';
      ctx.font = '24px Arial';
      ctx.fillText('has successfully completed the course', width / 2, 330);

      // Course title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Arial';
      ctx.fillText(courseTitle, width / 2, 390);

      // Completion date
      ctx.fillStyle = '#e5e7eb';
      ctx.font = '20px Arial';
      const formattedDate = new Date(completionDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      ctx.fillText(`Completed on: ${formattedDate}`, width / 2, 450);

      // TechyJaunt branding
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 32px Arial';
      ctx.fillText('TechyJaunt', width / 2, 550);

      ctx.fillStyle = '#e5e7eb';
      ctx.font = '18px Arial';
      ctx.fillText('Learning Platform', width / 2, 580);

      // Issue date
      ctx.textAlign = 'left';
      ctx.fillStyle = '#d1d5db';
      ctx.font = '16px Arial';
      const issueDateFormatted = new Date(issueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      ctx.fillText(`Issue Date: ${issueDateFormatted}`, 60, height - 80);

      // Certificate number
      ctx.textAlign = 'right';
      ctx.fillText(`Certificate No: ${certificateNumber}`, width - 60, height - 80);

      // Signature line (placeholder)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 100, height - 120);
      ctx.lineTo(width / 2 + 100, height - 120);
      ctx.stroke();

      ctx.fillStyle = '#e5e7eb';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Authorized Signature', width / 2, height - 100);

      // Convert canvas to buffer
      const buffer = canvas.toBuffer('image/png');

      return buffer;
    } catch (error) {
      logger.error(`Certificate image generation error: ${error.message}`);
      throw new AppError("Failed to generate certificate image", 500);
    }
  }

  /**
   * Generate certificate for user
   */
  async generateCertificate(userId, courseId) {
    try {
      // Check eligibility
      const eligibility = await this.checkEligibility(userId, courseId);
      
      if (!eligibility.eligible) {
        throw new AppError(eligibility.reason, 400);
      }

      // Get user and course details
      const user = await User.findById(userId);
      const course = await Course.findById(courseId);
      const progress = eligibility.progress;

      if (!user || !course) {
        throw new AppError("User or course not found", 404);
      }

      // Generate certificate details
      const certificateNumber = this.generateCertificateNumber();
      const verificationCode = this.generateVerificationCode();

      const certificateData = {
        studentName: `${user.firstName} ${user.lastName}`,
        studentEmail: user.email,
        courseTitle: course.title,
        courseCategory: course.category,
        courseLevel: course.level,
        courseDuration: course.duration,
        issueDate: new Date(),
        completionDate: progress.completedAt,
        certificateNumber,
        verificationCode,
        totalModules: progress.modules.length,
        totalLessons: progress.modules.reduce((sum, mod) => sum + mod.lessons.length, 0),
        totalWatchTime: progress.totalWatchTime,
        finalScore: progress.overallProgress
      };

      // Generate certificate image
      const certificateBuffer = await this.generateCertificateImage(certificateData);

      // Upload to Cloudinary
      const uploadResult = await uploadImage(certificateBuffer, {
        folder: "techyjaunt/certificates",
        public_id: `certificate_${userId}_${courseId}_${Date.now()}`,
        format: 'png',
        resource_type: 'image'
      });

      // Check if certificate already exists and update it, otherwise create new
      const existingCertificate = await Certificate.findOne({ userId, courseId });
      
      let certificate;
      if (existingCertificate) {
        // Update existing certificate (regeneration)
        existingCertificate.certificateNumber = certificateNumber;
        existingCertificate.verificationCode = verificationCode;
        existingCertificate.issueDate = certificateData.issueDate;
        existingCertificate.completionDate = certificateData.completionDate;
        existingCertificate.studentName = certificateData.studentName;
        existingCertificate.studentEmail = certificateData.studentEmail;
        existingCertificate.courseTitle = certificateData.courseTitle;
        existingCertificate.courseCategory = certificateData.courseCategory;
        existingCertificate.courseLevel = certificateData.courseLevel;
        existingCertificate.courseDuration = certificateData.courseDuration;
        existingCertificate.finalScore = certificateData.finalScore;
        existingCertificate.totalModules = certificateData.totalModules;
        existingCertificate.totalLessons = certificateData.totalLessons;
        existingCertificate.totalWatchTime = certificateData.totalWatchTime;
        existingCertificate.certificateUrl = uploadResult.secure_url;
        existingCertificate.certificatePublicId = uploadResult.public_id;
        existingCertificate.status = 'active';
        existingCertificate.isVerified = true;
        
        await existingCertificate.save();
        certificate = existingCertificate;
        
        logger.info(`Certificate regenerated for user ${userId} in course ${courseId}: ${certificateNumber}`);
      } else {
        // Create new certificate record
        certificate = new Certificate({
          userId,
          courseId,
          certificateNumber,
          verificationCode,
          issueDate: certificateData.issueDate,
          completionDate: certificateData.completionDate,
          studentName: certificateData.studentName,
          studentEmail: certificateData.studentEmail,
          courseTitle: certificateData.courseTitle,
          courseCategory: certificateData.courseCategory,
          courseLevel: certificateData.courseLevel,
          courseDuration: certificateData.courseDuration,
          finalScore: certificateData.finalScore,
          totalModules: certificateData.totalModules,
          totalLessons: certificateData.totalLessons,
          totalWatchTime: certificateData.totalWatchTime,
          certificateUrl: uploadResult.secure_url,
          certificatePublicId: uploadResult.public_id,
          status: 'active',
          isVerified: true
        });

        await certificate.save();
        
        logger.info(`Certificate generated for user ${userId} in course ${courseId}: ${certificateNumber}`);
      }

      return certificate;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Generate certificate error: ${error.message}`);
      throw new AppError(error.message || "Failed to generate certificate", 500);
    }
  }

  /**
   * Get user certificates
   */
  async getUserCertificates(userId, options = {}) {
    try {
      const { status = 'active' } = options;

      const query = { userId };
      if (status) {
        query.status = status;
      }

      const certificates = await Certificate.find(query)
        .populate('courseId', 'title category level thumbnail')
        .sort({ issueDate: -1 });

      return certificates;
    } catch (error) {
      throw new AppError(error.message || "Failed to get user certificates", 500);
    }
  }

  /**
   * Get certificate by ID
   */
  async getCertificateById(certificateId, userId) {
    try {
      const certificate = await Certificate.findOne({
        _id: certificateId,
        userId
      }).populate('courseId', 'title category level thumbnail description');

      if (!certificate) {
        throw new AppError("Certificate not found", 404);
      }

      return certificate;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to get certificate", 500);
    }
  }

  /**
   * Verify certificate by number or code
   */
  async verifyCertificate(certificateNumber, verificationCode) {
    try {
      const query = {};

      if (certificateNumber) {
        query.certificateNumber = certificateNumber;
      }

      if (verificationCode) {
        query.verificationCode = verificationCode;
      }

      if (Object.keys(query).length === 0) {
        throw new AppError("Certificate number or verification code required", 400);
      }

      const certificate = await Certificate.findOne(query)
        .populate('userId', 'firstName lastName email')
        .populate('courseId', 'title category level');

      if (!certificate) {
        return {
          valid: false,
          message: "Certificate not found"
        };
      }

      if (!certificate.isValid()) {
        return {
          valid: false,
          message: `Certificate is ${certificate.status}`,
          certificate
        };
      }

      return {
        valid: true,
        message: "Certificate is valid",
        certificate
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Certificate verification failed", 500);
    }
  }

  /**
   * Get certificate statistics for admin
   */
  async getCertificateStats(courseId = null) {
    try {
      const query = {};
      if (courseId) {
        query.courseId = courseId;
      }

      const totalCertificates = await Certificate.countDocuments(query);
      const activeCertificates = await Certificate.countDocuments({ ...query, status: 'active' });
      const revokedCertificates = await Certificate.countDocuments({ ...query, status: 'revoked' });

      // Certificates issued in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentCertificates = await Certificate.countDocuments({
        ...query,
        issueDate: { $gte: thirtyDaysAgo }
      });

      return {
        total: totalCertificates,
        active: activeCertificates,
        revoked: revokedCertificates,
        recentlyIssued: recentCertificates
      };
    } catch (error) {
      throw new AppError("Failed to get certificate statistics", 500);
    }
  }
}

export default new CertificateService();
