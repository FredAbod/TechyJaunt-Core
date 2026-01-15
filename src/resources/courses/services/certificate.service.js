import Certificate from "../models/certificate.js";
import Progress from "../models/progress.js";
import Course from "../models/course.js";
import User from "../../user/models/user.js";
import Subscription from "../../payments/models/subscription.js";
import AppError from "../../../utils/lib/appError.js";
import { generateRandomString } from "../../../utils/helper/helper.js";
import logger from "../../../utils/log/logger.js";
import PDFDocument from "pdfkit";
import { uploadDocument } from "../../../utils/image/cloudinary.js";

class CertificateService {
  /**
   * Check if user is eligible for certificate
   */
  async checkEligibility(userId, courseId) {
    try {
      console.log("=== CHECK ELIGIBILITY START ===");
      console.log("userId:", userId, "courseId:", courseId);

      // Check if user has completed the course
      const progress = await Progress.findOne({
        userId,
        courseId,
        isCompleted: true,
      });

      console.log(
        "Progress query result:",
        progress
          ? {
              id: progress._id,
              isCompleted: progress.isCompleted,
              overallProgress: progress.overallProgress,
              completedAt: progress.completedAt,
              modulesCount: progress.modules?.length,
            }
          : "No progress found with isCompleted: true"
      );

      // Also check if there's any progress at all
      if (!progress) {
        const anyProgress = await Progress.findOne({ userId, courseId });
        console.log(
          "Any progress for user/course:",
          anyProgress
            ? {
                id: anyProgress._id,
                isCompleted: anyProgress.isCompleted,
                overallProgress: anyProgress.overallProgress,
                completedAt: anyProgress.completedAt,
                modulesCount: anyProgress.modules?.length,
                modulesCompleted: anyProgress.modules?.filter(
                  (m) => m.isCompleted
                ).length,
              }
            : "No progress at all"
        );
      }

      if (!progress) {
        return {
          eligible: false,
          reason:
            "Course not completed. You must complete all modules and assessments to receive a certificate.",
        };
      }

      // Check if user has active subscription with certificate access
      const subscription = await Subscription.findOne({
        user: userId,
        courseId,
        status: "active",
        "featureAccess.certificate.hasAccess": true,
      });

      if (!subscription) {
        return {
          eligible: false,
          reason:
            "Certificate access not available. Please upgrade to Bronze or Gold plan to receive a certificate.",
        };
      }

      // Check if certificate already exists - return it but still allow regeneration
      const existingCertificate = await Certificate.findOne({
        userId,
        courseId,
        status: "active",
      });

      if (existingCertificate) {
        return {
          eligible: true,
          reason: "You can regenerate your certificate",
          existingCertificate,
          progress,
          subscription,
        };
      }

      return {
        eligible: true,
        progress,
        subscription,
      };
    } catch (error) {
      throw new AppError(
        error.message || "Failed to check certificate eligibility",
        500
      );
    }
  }

  /**
   * Generate certificate number
   */
  generateCertificateNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
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
   * Generate certificate as PDF
   */
  async generateCertificatePDF(certificateData) {
    try {
      const {
        studentName,
        courseTitle,
        issueDate,
        certificateNumber,
        completionDate,
      } = certificateData;

      return new Promise((resolve, reject) => {
        // Create PDF document (A4 landscape)
        const doc = new PDFDocument({
          size: "A4",
          layout: "landscape",
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;

        // Background - Professional gradient effect with blue
        doc.rect(0, 0, pageWidth, pageHeight).fill("#1e3a8a");

        // Outer border (gold)
        doc
          .rect(20, 20, pageWidth - 40, pageHeight - 40)
          .lineWidth(6)
          .stroke("#fbbf24");

        // Inner border (white)
        doc
          .rect(35, 35, pageWidth - 70, pageHeight - 70)
          .lineWidth(1)
          .stroke("#ffffff");

        // Title
        doc
          .fontSize(36)
          .font("Helvetica-Bold")
          .fillColor("#ffffff")
          .text("CERTIFICATE OF COMPLETION", 0, 80, {
            align: "center",
            width: pageWidth,
          });

        // Decorative line under title
        doc
          .moveTo(pageWidth / 2 - 150, 125)
          .lineTo(pageWidth / 2 + 150, 125)
          .lineWidth(2)
          .stroke("#fbbf24");

        // "This is to certify that"
        doc
          .fontSize(16)
          .font("Helvetica")
          .fillColor("#e5e7eb")
          .text("This is to certify that", 0, 160, {
            align: "center",
            width: pageWidth,
          });

        // Student name (gold)
        doc
          .fontSize(40)
          .font("Helvetica-Bold")
          .fillColor("#fbbf24")
          .text(studentName, 0, 195, {
            align: "center",
            width: pageWidth,
          });

        // Underline for name
        const nameWidth = doc.widthOfString(studentName);
        doc
          .moveTo((pageWidth - nameWidth) / 2, 245)
          .lineTo((pageWidth + nameWidth) / 2, 245)
          .lineWidth(1)
          .stroke("#fbbf24");

        // "has successfully completed the course"
        doc
          .fontSize(16)
          .font("Helvetica")
          .fillColor("#e5e7eb")
          .text("has successfully completed the course", 0, 270, {
            align: "center",
            width: pageWidth,
          });

        // Course title (white)
        doc
          .fontSize(28)
          .font("Helvetica-Bold")
          .fillColor("#ffffff")
          .text(courseTitle, 0, 305, {
            align: "center",
            width: pageWidth,
          });

        // Completion date
        const formattedCompletionDate = new Date(
          completionDate
        ).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        doc
          .fontSize(14)
          .font("Helvetica")
          .fillColor("#e5e7eb")
          .text(`Completed on: ${formattedCompletionDate}`, 0, 355, {
            align: "center",
            width: pageWidth,
          });

        // TechyJaunt branding
        doc
          .fontSize(26)
          .font("Helvetica-Bold")
          .fillColor("#fbbf24")
          .text("TechyJaunt", 0, 410, {
            align: "center",
            width: pageWidth,
          });

        doc
          .fontSize(12)
          .font("Helvetica")
          .fillColor("#e5e7eb")
          .text("Learning Platform", 0, 440, {
            align: "center",
            width: pageWidth,
          });

        // Signature line
        doc
          .moveTo(pageWidth / 2 - 80, pageHeight - 110)
          .lineTo(pageWidth / 2 + 80, pageHeight - 110)
          .lineWidth(1)
          .stroke("#ffffff");

        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor("#e5e7eb")
          .text("Authorized Signature", 0, pageHeight - 100, {
            align: "center",
            width: pageWidth,
          });

        // Issue date (bottom left)
        const formattedIssueDate = new Date(issueDate).toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        );
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor("#d1d5db")
          .text(`Issue Date: ${formattedIssueDate}`, 60, pageHeight - 60);

        // Certificate number (bottom right)
        doc.text(
          `Certificate No: ${certificateNumber}`,
          pageWidth - 250,
          pageHeight - 60
        );

        doc.end();
      });
    } catch (error) {
      logger.error(`Certificate PDF generation error: ${error.message}`);
      throw new AppError("Failed to generate certificate PDF", 500);
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
        totalLessons: progress.modules.reduce(
          (sum, mod) => sum + mod.lessons.length,
          0
        ),
        totalWatchTime: progress.totalWatchTime,
        finalScore: progress.overallProgress,
      };

      // Generate certificate PDF
      const certificateBuffer = await this.generateCertificatePDF(
        certificateData
      );

      // Upload to Cloudinary
      const uploadResult = await uploadDocument(certificateBuffer, {
        folder: "techyjaunt/certificates",
        public_id: `certificate_${userId}_${courseId}_${Date.now()}`,
      });

      // Check if certificate already exists and update it, otherwise create new
      const existingCertificate = await Certificate.findOne({
        userId,
        courseId,
      });

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
        existingCertificate.status = "active";
        existingCertificate.isVerified = true;

        await existingCertificate.save();
        certificate = existingCertificate;

        logger.info(
          `Certificate regenerated for user ${userId} in course ${courseId}: ${certificateNumber}`
        );
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
          status: "active",
          isVerified: true,
        });

        await certificate.save();

        logger.info(
          `Certificate generated for user ${userId} in course ${courseId}: ${certificateNumber}`
        );
      }

      return certificate;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Generate certificate error: ${error.message}`);
      throw new AppError(
        error.message || "Failed to generate certificate",
        500
      );
    }
  }

  /**
   * Get user certificates
   */
  async getUserCertificates(userId, options = {}) {
    try {
      const { status = "active" } = options;

      const query = { userId };
      if (status) {
        query.status = status;
      }

      const certificates = await Certificate.find(query)
        .populate("courseId", "title category level thumbnail")
        .sort({ issueDate: -1 });

      return certificates;
    } catch (error) {
      throw new AppError(
        error.message || "Failed to get user certificates",
        500
      );
    }
  }

  /**
   * Get certificate by ID
   */
  async getCertificateById(certificateId, userId) {
    try {
      const certificate = await Certificate.findOne({
        _id: certificateId,
        userId,
      }).populate("courseId", "title category level thumbnail description");

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
        throw new AppError(
          "Certificate number or verification code required",
          400
        );
      }

      const certificate = await Certificate.findOne(query)
        .populate("userId", "firstName lastName email")
        .populate("courseId", "title category level");

      if (!certificate) {
        return {
          valid: false,
          message: "Certificate not found",
        };
      }

      if (!certificate.isValid()) {
        return {
          valid: false,
          message: `Certificate is ${certificate.status}`,
          certificate,
        };
      }

      return {
        valid: true,
        message: "Certificate is valid",
        certificate,
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
      const activeCertificates = await Certificate.countDocuments({
        ...query,
        status: "active",
      });
      const revokedCertificates = await Certificate.countDocuments({
        ...query,
        status: "revoked",
      });

      // Certificates issued in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentCertificates = await Certificate.countDocuments({
        ...query,
        issueDate: { $gte: thirtyDaysAgo },
      });

      return {
        total: totalCertificates,
        active: activeCertificates,
        revoked: revokedCertificates,
        recentlyIssued: recentCertificates,
      };
    } catch (error) {
      throw new AppError("Failed to get certificate statistics", 500);
    }
  }
}

export default new CertificateService();
