import express from "express";
import {
  generateCertificate,
  getMyCertificates,
  getCertificateById,
  verifyCertificate,
  checkCertificateEligibility,
  getCertificateStats
} from "../controllers/certificate.controller.js";
import { isAuthenticated } from "../../../middleware/isAuthenticated.js";
import roleBasedAccess from "../../../middleware/rbac.js";

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

/**
 * @swagger
 * /api/v1/certificates/verify:
 *   get:
 *     tags:
 *       - Certificates
 *     summary: Verify a certificate (public)
 *     parameters:
 *       - in: query
 *         name: certificateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Certificate verification result
 */
router.get("/verify", verifyCertificate);

// ==================== PROTECTED ROUTES ====================

/**
 * @swagger
 * /api/v1/certificates:
 *   get:
 *     tags:
 *       - Certificates
 *     summary: Get all my certificates
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of user's certificates
 */
router.get("/", isAuthenticated, getMyCertificates);

/**
 * @swagger
 * /api/v1/certificates/{certificateId}:
 *   get:
 *     tags:
 *       - Certificates
 *     summary: Get specific certificate by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: certificateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Certificate details
 */
router.get("/:certificateId", isAuthenticated, getCertificateById);

/**
 * @swagger
 * /api/v1/certificates/courses/{courseId}/eligibility:
 *   get:
 *     tags:
 *       - Certificates
 *     summary: Check certificate eligibility for course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Certificate eligibility status
 */
router.get("/courses/:courseId/eligibility", isAuthenticated, checkCertificateEligibility);

/**
 * @swagger
 * /api/v1/certificates/courses/{courseId}/generate:
 *   post:
 *     tags:
 *       - Certificates
 *     summary: Generate certificate for course completion
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Certificate generated successfully
 */
router.post("/courses/:courseId/generate", isAuthenticated, generateCertificate);

// ==================== ADMIN ROUTES ====================

/**
 * @swagger
 * /api/v1/certificates/admin/stats:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get certificate statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Certificate statistics and metrics
 */
router.get("/admin/stats", isAuthenticated, roleBasedAccess(["superAdmin", "admin"]), getCertificateStats);

export default router;
