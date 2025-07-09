import Joi from "joi";

export const subscriptionValidation = {
  initializeSubscription: Joi.object({
    planType: Joi.string()
      .valid("bronze", "silver", "gold")
      .required()
      .messages({
        "any.only": "Plan type must be one of: bronze, silver, gold",
        "any.required": "Plan type is required"
      })
  })
};
