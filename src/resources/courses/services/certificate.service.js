import Certificate from "../models/certificate.js";
import Progress from "../models/progress.js";
import Course from "../models/course.js";
import User from "../../user/models/user.js";
import Subscription from "../../payments/models/subscription.js";
import AppError from "../../../utils/lib/appError.js";
import { generateRandomString } from "../../../utils/helper/helper.js";
import logger from "../../../utils/log/logger.js";
import PDFDocument from "pdfkit";
import { uploadDocument } from "../../../utils/image/s3.js";

class CertificateService {
  /**
   * Check if user is eligible for certificate
   */
  async checkEligibility(userId, courseId) {
    try {
      // Check if user has completed the course
      const progress = await Progress.findOne({
        userId,
        courseId,
        isCompleted: true,
      });

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
        500,
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

        // Background
        doc.rect(0, 0, pageWidth, pageHeight).fill("#ffffff");

        // Outer border (soft gray)
        doc
          .rect(24, 24, pageWidth - 48, pageHeight - 48)
          .lineWidth(2)
          .stroke("#e5e7eb");

        // Subtle inner border (navy)
        doc
          .rect(38, 38, pageWidth - 76, pageHeight - 76)
          .lineWidth(1)
          .stroke("#0f2a6b");

        // "TechyJaunt" brand (simple text logo)
        doc
          .fontSize(18)
          .font("Helvetica-Bold")
          .fillColor("#0f2a6b")
          .text("TechyJaunt", 60, 60);

        // Title
        doc
          .fontSize(32)
          .font("Helvetica-Bold")
          .fillColor("#0f2a6b")
          .text("CERTIFICATE OF COMPLETION", 0, 100, {
            align: "center",
            width: pageWidth,
          });

        // "Proudly presented to"
        doc
          .fontSize(14)
          .font("Helvetica")
          .fillColor("#374151")
          .text("Proudly Presented to", 0, 155, {
            align: "center",
            width: pageWidth,
          });

        // Student name
        doc
          .fontSize(40)
          .font("Helvetica-Bold")
          .fillColor("#111827")
          .text(studentName, 0, 185, {
            align: "center",
            width: pageWidth,
          });

        // Underline for name
        const nameWidth = doc.widthOfString(studentName);
        doc
          .moveTo((pageWidth - nameWidth) / 2, 235)
          .lineTo((pageWidth + nameWidth) / 2, 235)
          .lineWidth(1)
          .stroke("#d1d5db");

        // Completion text
        doc
          .fontSize(12)
          .font("Helvetica")
          .fillColor("#374151")
          .text("For completing the", 0, 255, {
            align: "center",
            width: pageWidth,
          });

        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .fillColor("#0f2a6b")
          .text(courseTitle, 0, 275, {
            align: "center",
            width: pageWidth,
          });

        // Completion date
        const formattedCompletionDate = new Date(
          completionDate,
        ).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        doc
          .fontSize(12)
          .font("Helvetica")
          .fillColor("#374151")
          .text(`Completed on ${formattedCompletionDate}`, 0, 310, {
            align: "center",
            width: pageWidth,
          });

        // Seal (simple rosette)
        const sealX = pageWidth - 210;
        const sealY = 120;
        doc.circle(sealX, sealY, 55).fill("#0f2a6b");
        doc.circle(sealX, sealY, 46).fill("#ffffff");
        doc.circle(sealX, sealY, 36).fill("#0f2a6b");
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .fillColor("#ffffff")
          .text("✓", sealX - 8, sealY - 12, { width: 16, align: "center" });

        // Signature line
        doc
          .moveTo(90, pageHeight - 120)
          .lineTo(290, pageHeight - 120)
          .lineWidth(1)
          .stroke("#9ca3af");

        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor("#374151")
          .text("Authorized Signature", 90, pageHeight - 110);

        // Issue date (bottom left)
        const formattedIssueDate = new Date(issueDate).toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          },
        );
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor("#6b7280")
          .text(`Issued: ${formattedIssueDate}`, 60, pageHeight - 70);

        // Certificate ID number (bottom right)
        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .fillColor("#111827")
          .text(`Certificate ID NO: ${certificateNumber}`, pageWidth - 320, pageHeight - 70);

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

      // Check if certificate already exists (so we keep its ID stable across regenerations)
      const existingCertificate = await Certificate.findOne({
        userId,
        courseId,
      });

      // Generate certificate details
      // IMPORTANT: certificateNumber is treated as the persistent Certificate ID number.
      const certificateNumber =
        existingCertificate?.certificateNumber || this.generateCertificateNumber();
      const verificationCode =
        existingCertificate?.verificationCode || this.generateVerificationCode();

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
          0,
        ),
        totalWatchTime: progress.totalWatchTime,
        finalScore: progress.overallProgress,
      };

      // Generate certificate PDF
      const certificateBuffer =
        await this.generateCertificatePDF(certificateData);

      // Upload to Cloudinary
      const uploadResult = await uploadDocument(certificateBuffer, {
        folder: "techyjaunt/certificates",
        public_id: `certificate_${userId}_${courseId}_${Date.now()}`,
      });

      let certificate;
      if (existingCertificate) {
        // Update existing certificate (regeneration)
        // Keep certificateNumber + verificationCode stable for verifications and ID referencing
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
          `Certificate regenerated for user ${userId} in course ${courseId}: ${certificateNumber}`,
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
          `Certificate generated for user ${userId} in course ${courseId}: ${certificateNumber}`,
        );
      }

      return certificate;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Generate certificate error: ${error.message}`);
      throw new AppError(
        error.message || "Failed to generate certificate",
        500,
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
        500,
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
          400,
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
