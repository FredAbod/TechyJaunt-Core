import Joi from "joi";

export const paymentValidation = {
  initializePayment: Joi.object({
    courseId: Joi.string().required(),
    paymentMethod: Joi.string().valid("card", "bank_transfer", "ussd").required(),
  }),
  
  verifyPayment: Joi.object({
    reference: Joi.string().required(),
  }),

  webhook: Joi.object({
    event: Joi.string().required(),
    data: Joi.object().required(),
  }),
};
