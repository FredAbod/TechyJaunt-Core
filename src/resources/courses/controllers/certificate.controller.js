import certificateService from "../services/certificate.service.js";
import { successResMsg } from "../../../utils/lib/response.js";
import AppError from "../../../utils/lib/appError.js";
import logger from "../../../utils/log/logger.js";

/**
 * Generate certificate for course completion
 * POST /api/v1/courses/:courseId/certificates/generate
 */
export const generateCertificate = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    logger.info(`Certificate generation requested by user ${userId} for course ${courseId}`);

    const certificate = await certificateService.generateCertificate(userId, courseId);

    return successResMsg(res, 201, {
      message: "Certificate generated successfully",
      data: certificate
    });
  } catch (error) {
    logger.error(`Generate certificate error: ${error.message}`);
    next(error);
  }
};

/**
 * Get all certificates for logged-in user
 * GET /api/v1/certificates
 */
export const getMyCertificates = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { status } = req.query;

    const certificates = await certificateService.getUserCertificates(userId, { status });

    return successResMsg(res, 200, {
      message: "Certificates retrieved successfully",
      data: certificates,
      count: certificates.length
    });
  } catch (error) {
    logger.error(`Get certificates error: ${error.message}`);
    next(error);
  }
};

/**
 * Get specific certificate by ID
 * GET /api/v1/certificates/:certificateId
 */
export const getCertificateById = async (req, res, next) => {
  try {
    const { certificateId } = req.params;
    const userId = req.user.userId;

    const certificate = await certificateService.getCertificateById(certificateId, userId);

    return successResMsg(res, 200, {
      message: "Certificate retrieved successfully",
      data: certificate
    });
  } catch (error) {
    logger.error(`Get certificate by ID error: ${error.message}`);
    next(error);
  }
};

/**
 * Verify certificate (public endpoint)
 * GET /api/v1/certificates/verify
 */
export const verifyCertificate = async (req, res, next) => {
  try {
    const { certificateNumber, verificationCode } = req.query;

    if (!certificateNumber && !verificationCode) {
      throw new AppError("Certificate number or verification code is required", 400);
    }

    const result = await certificateService.verifyCertificate(certificateNumber, verificationCode);

    return successResMsg(res, 200, {
      message: result.message,
      data: result
    });
  } catch (error) {
    logger.error(`Verify certificate error: ${error.message}`);
    next(error);
  }
};

/**
 * Check certificate eligibility for a course
 * GET /api/v1/courses/:courseId/certificates/eligibility
 */
export const checkCertificateEligibility = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    const eligibility = await certificateService.checkEligibility(userId, courseId);

    return successResMsg(res, 200, {
      message: eligibility.eligible ? "Eligible for certificate" : eligibility.reason,
      data: eligibility
    });
  } catch (error) {
    logger.error(`Check certificate eligibility error: ${error.message}`);
    next(error);
  }
};

/**
 * Get certificate statistics (Admin only)
 * GET /api/v1/admin/certificates/stats
 */
export const getCertificateStats = async (req, res, next) => {
  try {
    const { courseId } = req.query;

    const stats = await certificateService.getCertificateStats(courseId);

    return successResMsg(res, 200, {
      message: "Certificate statistics retrieved successfully",
      data: stats
    });
  } catch (error) {
    logger.error(`Get certificate stats error: ${error.message}`);
    next(error);
  }
};
