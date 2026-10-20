import PlanGrantService from "../services/planGrant.service.js";
import planGrantWorker from "../services/planGrantWorker.js";
import { planGrantValidation } from "../../../utils/validation/planGrant.validation.js";
import { successResMsg, errorResMsg } from "../../../utils/lib/response.js";
import logger from "../../../utils/log/logger.js";

// Validate and return the converted value (defaults, lowercasing, etc.).
// The shared validateRequest middleware only checks; it doesn't apply them.
const validate = (schema, data) => {
  const { value, error } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    const err = new Error(
      `Validation failed: ${error.details.map((d) => d.message).join(", ")}`,
    );
    err.statusCode = 400;
    throw err;
  }
  return value;
};

const handleError = (res, error, context) => {
  // Row-level problems (e.g. unknown course codes) are returned so the UI can point at them
  if (error.details) {
    return res.status(error.statusCode || 400).json({
      status: "error",
      message: error.message,
      errors: error.details,
    });
  }
  if (error.statusCode && error.statusCode < 500) {
    return errorResMsg(res, error.statusCode, error.message);
  }
  logger.error(`${context}: ${error.message}`, { stack: error.stack });
  return errorResMsg(res, 500, "Something went wrong. Please try again.");
};

const toJobSummary = (job) => ({
  id: job._id,
  status: job.status,
  planType: job.planType,
  planName: job.planSnapshot?.name,
  courseId: job.courseId,
  courseTitle: job.courseTitle,
  courses: job.courses,
  durationMonths: job.durationMonths,
  notifyExistingUsers: job.notifyExistingUsers,
  totals: job.totals,
  createdAt: job.createdAt,
});

export const previewPlanGrant = async (req, res) => {
  try {
    const payload = validate(planGrantValidation.createJob, req.body);
    const preview = await PlanGrantService.previewJob({
      adminId: req.user.userId,
      payload,
    });
    return successResMsg(res, 200, {
      message: "Preview generated. Nothing has been granted yet.",
      ...preview,
    });
  } catch (error) {
    return handleError(res, error, "Preview plan grant error");
  }
};

export const listPlanGrantCourses = async (req, res) => {
  try {
    const courses = await PlanGrantService.listCourses();
    return successResMsg(res, 200, { message: "Courses retrieved", courses });
  } catch (error) {
    return handleError(res, error, "List plan grant courses error");
  }
};

export const cancelPlanGrantJob = async (req, res) => {
  try {
    const { jobId } = validate(planGrantValidation.jobIdParams, req.params);
    const { job, rowsCancelled } = await PlanGrantService.cancelJob({
      adminId: req.user.userId,
      jobId,
    });
    return successResMsg(res, 200, {
      message: `Job cancelled. ${rowsCancelled} row(s) were not processed; rows already granted keep their access.`,
      job,
      rowsCancelled,
    });
  } catch (error) {
    return handleError(res, error, "Cancel plan grant job error");
  }
};

export const createPlanGrantJob = async (req, res) => {
  try {
    const payload = validate(planGrantValidation.createJob, req.body);
    const idempotencyKey = req.get("Idempotency-Key")
      ? validate(planGrantValidation.idempotencyKey, req.get("Idempotency-Key"))
      : undefined;

    const { job, reused } = await PlanGrantService.createJob({
      adminId: req.user.userId,
      payload,
      idempotencyKey,
    });

    if (!reused) planGrantWorker.kick();

    return successResMsg(res, reused ? 200 : 202, {
      message: reused
        ? "A job with this Idempotency-Key already exists"
        : "Plan grant job queued. Poll the job for progress and results.",
      job: toJobSummary(job),
      links: {
        self: `/api/v1/admin/plan-grants/${job._id}`,
        items: `/api/v1/admin/plan-grants/${job._id}/items`,
      },
    });
  } catch (error) {
    return handleError(res, error, "Create plan grant job error");
  }
};

export const listPlanGrantJobs = async (req, res) => {
  try {
    const query = validate(planGrantValidation.listJobsQuery, req.query);
    const result = await PlanGrantService.listJobs(query);
    return successResMsg(res, 200, {
      message: "Plan grant jobs retrieved",
      ...result,
    });
  } catch (error) {
    return handleError(res, error, "List plan grant jobs error");
  }
};

export const getPlanGrantJob = async (req, res) => {
  try {
    const { jobId } = validate(planGrantValidation.jobIdParams, req.params);
    const job = await PlanGrantService.getJob(jobId);
    return successResMsg(res, 200, { message: "Plan grant job retrieved", job });
  } catch (error) {
    return handleError(res, error, "Get plan grant job error");
  }
};

export const listPlanGrantItems = async (req, res) => {
  try {
    const { jobId } = validate(planGrantValidation.jobIdParams, req.params);
    const query = validate(planGrantValidation.listItemsQuery, req.query);
    const result = await PlanGrantService.listItems(jobId, query);
    return successResMsg(res, 200, {
      message: "Plan grant results retrieved",
      ...result,
    });
  } catch (error) {
    return handleError(res, error, "List plan grant items error");
  }
};
