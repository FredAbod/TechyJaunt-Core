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
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CERTIFICATE_TEMPLATE_PATH = path.join(
  __dirname,
  "../assets/certificate-template.png",
);

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

  sanitizeCertificateFilenamePart(str) {
    return String(str ?? "")
      .replace(/[/\\:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
  }

  /**
   * S3 object key segment: "Techyjaunt {course} course certificate for {name}.pdf"
   */
  buildCertificateUploadPublicId(courseTitle, studentName) {
    const t = this.sanitizeCertificateFilenamePart(courseTitle);
    const n = this.sanitizeCertificateFilenamePart(studentName);
    const base = `Techyjaunt ${t} course certificate for ${n}.pdf`;
    return base.length > 900 ? base.slice(0, 900) : base;
  }

  /**
   * Generate certificate as PDF (official template image + dynamic fields)
   */
  async generateCertificatePDF(certificateData) {
    try {
      const {
        studentName,
        courseTitle,
        certificateNumber,
        completionDate,
      } = certificateData;

      return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
          size: "A4",
          layout: "landscape",
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
        });

        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const navy = "#0f2a6b";
        const textBlack = "#111827";

        const drawDynamicFields = () => {
          doc
            .font("Times-Bold")
            .fontSize(28)
            .fillColor(textBlack)
            .text(studentName, 0, pageHeight * 0.33, {
              width: pageWidth,
              align: "center",
            });

          const monthYear = new Date(completionDate).toLocaleDateString(
            "en-US",
            {
              month: "long",
              year: "numeric",
            },
          );

          const copyWidth = pageWidth - 200;
          const copyLeft = 100;
          let y = pageHeight * 0.47;

          doc
            .font("Helvetica")
            .fontSize(11)
            .fillColor(textBlack)
            .text("For completing the", copyLeft, y, {
              width: copyWidth,
              align: "center",
            });
          y += 18;
          doc.font("Helvetica-Bold").fontSize(12).fillColor(navy);
          const titleHeight = doc.heightOfString(courseTitle, {
            width: copyWidth,
          });
          doc.text(courseTitle, copyLeft, y, {
            width: copyWidth,
            align: "center",
          });
          y += titleHeight + 10;
          doc
            .font("Helvetica-Bold")
            .fontSize(11)
            .fillColor(navy)
            .text(`concluded in ${monthYear}`, copyLeft, y, {
              width: copyWidth,
              align: "center",
            });

          doc
            .font("Helvetica")
            .fontSize(9)
            .fillColor(textBlack)
            .text(`Certificate ID NO: ${certificateNumber}`, 36, pageHeight - 48, {
              width: pageWidth - 72,
              align: "right",
            });
        };

        if (fs.existsSync(CERTIFICATE_TEMPLATE_PATH)) {
          doc.image(CERTIFICATE_TEMPLATE_PATH, 0, 0, {
            width: pageWidth,
            height: pageHeight,
          });
          drawDynamicFields();
        } else {
          logger.warn("Certificate template image missing; using plain PDF", {
            path: CERTIFICATE_TEMPLATE_PATH,
          });
          doc.rect(0, 0, pageWidth, pageHeight).fill("#ffffff");
          drawDynamicFields();
        }

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
      const uploadPublicId = this.buildCertificateUploadPublicId(
        certificateData.courseTitle,
        certificateData.studentName,
      );

      const uploadResult = await uploadDocument(certificateBuffer, {
        folder: "techyjaunt/certificates",
        public_id: uploadPublicId,
        contentType: "application/pdf",
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
