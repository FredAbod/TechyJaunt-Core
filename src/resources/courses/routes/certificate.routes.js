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

/**
 * Public routes
 */
// Verify certificate (no authentication required)
router.get("/verify", verifyCertificate);

/**
 * Protected routes (authenticated users)
 */
// Get all my certificates
router.get("/", isAuthenticated, getMyCertificates);

// Get specific certificate by ID
router.get("/:certificateId", isAuthenticated, getCertificateById);

// Check eligibility for certificate
router.get("/courses/:courseId/eligibility", isAuthenticated, checkCertificateEligibility);

// Generate certificate for course completion
router.post("/courses/:courseId/generate", isAuthenticated, generateCertificate);

/**
 * Admin routes
 */
// Get certificate statistics
router.get("/admin/stats", isAuthenticated, roleBasedAccess(["superAdmin", "admin"]), getCertificateStats);

export default router;
