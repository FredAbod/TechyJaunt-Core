import express from "express";
import rateLimit from "express-rate-limit";
import { isAuthenticated } from "../../../middleware/isAuthenticated.js";
import roleBasedAccess from "../../../middleware/rbac.js";
import {
  createPlanGrantJob,
  listPlanGrantJobs,
  getPlanGrantJob,
  listPlanGrantItems,
} from "../controllers/planGrant.controller.js";
import { PLAN_GRANT_ADMIN_ROLES } from "../planGrant.constants.js";

const router = express.Router();

// Each job can create accounts and send hundreds of emails; cap submissions.
const createJobLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many plan grant jobs submitted, please try again later.",
  keyGenerator: (req) => req.user?.userId || req.ip,
});

router.use(isAuthenticated, roleBasedAccess(PLAN_GRANT_ADMIN_ROLES));

/**
 * @swagger
 * /api/v1/admin/plan-grants:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Bulk grant a plan to a list of emails
 *     description: |
 *       Queues a job that grants the plan for the course to every recipient.
 *       Emails without an account get a new account and a temporary password by email.
 *       Existing accounts are granted access unless they are suspended or inactive, are not
 *       students, have a pending payment for the course, or already have access.
 *       Returns 202 with a job id; poll the job for progress and per-email results.
 *       Send an `Idempotency-Key` header to make retries safe.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: false
 *         schema:
 *           type: string
 *           maxLength: 128
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [planType, courseId, recipients]
 *             properties:
 *               planType:
 *                 type: string
 *                 enum: ["bronze", "silver", "gold"]
 *               courseId:
 *                 type: string
 *               durationMonths:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 24
 *                 description: For monthly plans only (default 1). Not allowed for one-time plans.
 *               notifyExistingUsers:
 *                 type: boolean
 *                 default: true
 *                 description: New accounts are always emailed their credentials.
 *               note:
 *                 type: string
 *                 maxLength: 500
 *               recipients:
 *                 type: array
 *                 maxItems: 500
 *                 items:
 *                   oneOf:
 *                     - type: string
 *                       example: jane@example.com
 *                     - type: object
 *                       required: [email]
 *                       properties:
 *                         email:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *     responses:
 *       202:
 *         description: Job queued
 *       200:
 *         description: Existing job returned for a repeated Idempotency-Key
 *       400:
 *         description: Validation error, inactive plan, or archived course
 *       403:
 *         description: Not an admin, or no permission for this course
 *   get:
 *     tags:
 *       - Admin
 *     summary: List plan grant jobs
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ["queued", "processing", "completed", "completed_with_errors", "failed"]
 *     responses:
 *       200:
 *         description: Paginated list of jobs
 */
router.post("/", createJobLimiter, createPlanGrantJob);
router.get("/", listPlanGrantJobs);

/**
 * @swagger
 * /api/v1/admin/plan-grants/{jobId}:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get a plan grant job's status, totals and outcome breakdown
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job details
 *       404:
 *         description: Job not found
 */
router.get("/:jobId", getPlanGrantJob);

/**
 * @swagger
 * /api/v1/admin/plan-grants/{jobId}/items:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Per-email results for a plan grant job
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ["pending", "granted", "skipped", "failed"]
 *       - in: query
 *         name: outcome
 *         schema:
 *           type: string
 *           enum:
 *             - GRANTED_NEW_ACCOUNT
 *             - GRANTED_ACTIVATED_ACCOUNT
 *             - GRANTED_EXISTING_ACCOUNT
 *             - SKIPPED_ALREADY_HAS_ACCESS
 *             - SKIPPED_PENDING_PAYMENT
 *             - SKIPPED_ACCOUNT_RESTRICTED
 *             - SKIPPED_NOT_STUDENT
 *             - INVALID_EMAIL
 *             - ERROR
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
 *         description: Paginated per-email results
 */
router.get("/:jobId/items", listPlanGrantItems);

export default router;
