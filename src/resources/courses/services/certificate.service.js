import Certificate from "../models/certificate.js";
import Progress from "../models/progress.js";
import Course from "../models/course.js";
import User from "../../user/models/user.js";
import Subscription from "../../payments/models/subscription.js";
import AppError from "../../../utils/lib/appError.js";
import { generateRandomString } from "../../../utils/helper/helper.js";
import logger from "../../../utils/log/logger.js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { uploadDocument } from "../../../utils/image/s3.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Background with sample name/course/ID already removed (see scripts/build-certificate-blank-template.mjs). */
const CERTIFICATE_TEMPLATE_BLANK_PNG = path.join(
  __dirname,
  "../assets/certificate-template-blank.png",
);

/** Design artboard (matches blank PNG export). */
const ARTBOARD_W = 1024;
const ARTBOARD_H = 723;

/** Text sits in the main body column (left of the seal). */
const CONTENT = {
  left: 95,
  width: 720,
};

const LAYOUT = {
  nameTop: 332,
  nameSize: 25,
  achievementTop: 392,
  achievementSize: 10.5,
  courseSize: 11.5,
  certIdLeft: 668,
  certIdTop: 548,
  certIdSize: 7.5,
};

const NAVY = rgb(0.059, 0.165, 0.42);
const TEXT_BLACK = rgb(0.067, 0.094, 0.153);

function drawCenteredInColumn(
  page,
  text,
  topY,
  font,
  size,
  color,
  sx,
  sy,
  pageHeight,
) {
  const boxLeft = CONTENT.left * sx;
  const boxWidth = CONTENT.width * sx;
  const textWidth = font.widthOfTextAtSize(text, size);
  const x = boxLeft + (boxWidth - textWidth) / 2;
  const y = pageHeight - topY * sy - size;
  page.drawText(text, { x, y, size, font, color });
}

function wrapTextLines(font, text, size, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawAchievementFromTop(
  page,
  courseTitle,
  completionDate,
  fonts,
  sx,
  sy,
  pageHeight,
) {
  const monthYear = new Date(completionDate).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const prefix = "For completing the ";
  const middle = " concluded in ";
  const boxLeft = CONTENT.left * sx;
  const maxWidth = CONTENT.width * sx;
  const size = LAYOUT.achievementSize;
  const courseSize = LAYOUT.courseSize;

  const segments = [
    { text: prefix, font: fonts.regular, size, color: TEXT_BLACK },
    { text: courseTitle, font: fonts.bold, size: courseSize, color: NAVY },
    { text: middle, font: fonts.regular, size, color: TEXT_BLACK },
    { text: monthYear, font: fonts.bold, size: courseSize, color: NAVY },
  ];

  const totalWidth = segments.reduce(
    (sum, seg) => sum + seg.font.widthOfTextAtSize(seg.text, seg.size),
    0,
  );

  let topY = LAYOUT.achievementTop;

  if (totalWidth <= maxWidth) {
    let x = boxLeft + (maxWidth - totalWidth) / 2;
    const y = pageHeight - topY * sy - courseSize;
    for (const seg of segments) {
      page.drawText(seg.text, {
        x,
        y,
        size: seg.size,
        font: seg.font,
        color: seg.color,
      });
      x += seg.font.widthOfTextAtSize(seg.text, seg.size);
    }
    return;
  }

  drawCenteredInColumn(
    page,
    "For completing the",
    topY,
    fonts.regular,
    size,
    TEXT_BLACK,
    sx,
    sy,
    pageHeight,
  );
  topY += 16;

  const courseLines = wrapTextLines(fonts.bold, courseTitle, courseSize, maxWidth);
  for (const line of courseLines) {
    drawCenteredInColumn(
      page,
      line,
      topY,
      fonts.bold,
      courseSize,
      NAVY,
      sx,
      sy,
      pageHeight,
    );
    topY += 15;
  }

  drawCenteredInColumn(
    page,
    `concluded in ${monthYear}`,
    topY + 2,
    fonts.bold,
    courseSize,
    NAVY,
    sx,
    sy,
    pageHeight,
  );
}

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

  resolveStudentName(user) {
    return [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  }

  resolveCourseTitle(course) {
    const title =
      course?.certificateTitle?.trim() ||
      course?.title?.trim() ||
      "Course";
    return title;
  }

  /**
   * Generate certificate PDF: blank official artwork + student/course fields only.
   */
  async generateCertificatePDF(certificateData) {
    try {
      const {
        studentName,
        courseTitle,
        certificateNumber,
        completionDate,
      } = certificateData;

      if (!fs.existsSync(CERTIFICATE_TEMPLATE_BLANK_PNG)) {
        throw new AppError(
          "Certificate blank template is missing on server",
          500,
        );
      }

      const pngBytes = fs.readFileSync(CERTIFICATE_TEMPLATE_BLANK_PNG);
      const pdfDoc = await PDFDocument.create();
      const background = await pdfDoc.embedPng(pngBytes);
      const pageWidth = ARTBOARD_W;
      const pageHeight = ARTBOARD_H;
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawImage(background, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
      });

      const sx = pageWidth / ARTBOARD_W;
      const sy = pageHeight / ARTBOARD_H;

      const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      drawCenteredInColumn(
        page,
        studentName,
        LAYOUT.nameTop,
        timesBold,
        LAYOUT.nameSize,
        NAVY,
        sx,
        sy,
        pageHeight,
      );

      drawAchievementFromTop(
        page,
        courseTitle,
        completionDate,
        { regular: helvetica, bold: helveticaBold },
        sx,
        sy,
        pageHeight,
      );

      const certIdText = `Certificate ID NO: ${certificateNumber}`;
      page.drawText(certIdText, {
        x: LAYOUT.certIdLeft * sx,
        y: pageHeight - LAYOUT.certIdTop * sy - LAYOUT.certIdSize,
        size: LAYOUT.certIdSize,
        font: helvetica,
        color: TEXT_BLACK,
      });

      return Buffer.from(await pdfDoc.save());
    } catch (error) {
      if (error instanceof AppError) throw error;
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
        studentName: this.resolveStudentName(user),
        studentEmail: user.email,
        courseTitle: this.resolveCourseTitle(course),
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
