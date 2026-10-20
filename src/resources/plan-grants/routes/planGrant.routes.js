import express from "express";
import rateLimit from "express-rate-limit";
import { isAuthenticated } from "../../../middleware/isAuthenticated.js";
import roleBasedAccess from "../../../middleware/rbac.js";
import {
  createPlanGrantJob,
  previewPlanGrant,
  listPlanGrantCourses,
  cancelPlanGrantJob,
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

// Previews are read-only but each one evaluates up to 2,000 rows
const previewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many previews, please try again later.",
  keyGenerator: (req) => req.user?.userId || req.ip,
});

router.use(isAuthenticated, roleBasedAccess(PLAN_GRANT_ADMIN_ROLES));

/**
 * @swagger
 * /api/v1/admin/plan-grants/courses:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Courses that can be granted, with their codes (for CSV templates)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All non-archived courses with title, code and status
 */
router.get("/courses", listPlanGrantCourses);

/**
 * @swagger
 * /api/v1/admin/plan-grants/preview:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Dry run of a plan grant (nothing is written)
 *     description: |
 *       Same body as POST /plan-grants. Returns a summary (new accounts, emails to send,
 *       counts per outcome and per course) and the predicted outcome of every row.
 *       Unknown or archived course codes return 400 with an `errors` array of row numbers.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Predicted outcomes
 *       400:
 *         description: Validation error or unknown course codes
 */
router.post("/preview", previewLimiter, previewPlanGrant);

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
 *                 description: Default course for rows that don't name one
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
 *                 maxItems: 2000
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
 *                         courseCode:
 *                           type: string
 *                           example: DA-101
 *                         courseId:
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
 *           enum: ["queued", "processing", "completed", "completed_with_errors", "failed", "cancelled"]
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
 * /api/v1/admin/plan-grants/{jobId}/cancel:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Cancel a queued or running job
 *     description: Rows not yet started are marked cancelled. Rows already granted keep their access.
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
 *         description: Job cancelled
 *       409:
 *         description: Job already finished
 */
router.post("/:jobId/cancel", cancelPlanGrantJob);

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
 *           enum: ["pending", "granted", "skipped", "failed", "cancelled"]
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Filter by email (partial match)
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
 *             - CANCELLED
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
