import Joi from "joi";

export const paymentValidation = {
  initializePayment: {
    body: Joi.object({
      courseId: Joi.string().required(),
      paymentMethod: Joi.string().valid("card", "bank_transfer", "ussd").required(),
    }),
  },
  
  verifyPayment: {
    params: Joi.object({
      reference: Joi.string().required(),
    }),
  },

  webhook: {
    headers: Joi.object({
      "x-paystack-signature": Joi.string().required(),
    }).unknown(true),
  },
};
