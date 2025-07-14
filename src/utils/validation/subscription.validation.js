import Joi from "joi";

export const subscriptionValidation = {
  initializeSubscription: Joi.object({
    planType: Joi.string()
      .valid("bronze", "silver", "gold")
      .required()
      .messages({
        "any.only": "Plan type must be one of: bronze, silver, gold",
        "any.required": "Plan type is required"
      }),
    courseId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Course ID must be a valid MongoDB ObjectId",
        "any.required": "Course ID is required"
      })
  })
};
