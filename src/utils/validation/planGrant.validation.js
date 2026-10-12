import Joi from "joi";
import {
  ITEM_OUTCOME,
  ITEM_STATUS,
  JOB_STATUS,
  PLAN_GRANT_LIMITS,
} from "../../resources/plan-grants/planGrant.constants.js";

const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({ "string.pattern.base": "{#label} must be a valid MongoDB ObjectId" });

const name = Joi.string().trim().max(100).allow("");

// Emails are only loosely checked here; the service validates each one and
// reports invalid rows individually instead of rejecting the whole batch.
const recipient = Joi.alternatives().try(
  Joi.string().max(320),
  Joi.object({
    email: Joi.string().max(320).required(),
    firstName: name,
    lastName: name,
  }),
);

const pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

export const planGrantValidation = {
  createJob: Joi.object({
    planType: Joi.string()
      .lowercase()
      .valid("bronze", "silver", "gold")
      .required()
      .messages({ "any.only": "Plan type must be one of: bronze, silver, gold" }),
    courseId: objectId.required(),
    durationMonths: Joi.number()
      .integer()
      .min(1)
      .max(PLAN_GRANT_LIMITS.MAX_DURATION_MONTHS),
    notifyExistingUsers: Joi.boolean().default(true),
    note: Joi.string().trim().max(500).allow(""),
    recipients: Joi.array()
      .items(recipient)
      .min(1)
      .max(PLAN_GRANT_LIMITS.MAX_RECIPIENTS)
      .required()
      .messages({
        "array.max": `A single request can include at most ${PLAN_GRANT_LIMITS.MAX_RECIPIENTS} recipients`,
      }),
  }),

  idempotencyKey: Joi.string()
    .max(128)
    .pattern(/^[A-Za-z0-9_\-:.]+$/)
    .label("Idempotency-Key"),

  jobIdParams: Joi.object({ jobId: objectId.required() }),

  listJobsQuery: Joi.object({
    ...pagination,
    status: Joi.string().valid(...Object.values(JOB_STATUS)),
  }),

  listItemsQuery: Joi.object({
    ...pagination,
    limit: Joi.number().integer().min(1).max(200).default(50),
    status: Joi.string().valid(...Object.values(ITEM_STATUS)),
    outcome: Joi.string().valid(...Object.values(ITEM_OUTCOME)),
  }),
};
