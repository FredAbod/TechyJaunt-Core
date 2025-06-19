import { errorResMsg } from "../utils/lib/response.js";

export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return errorResMsg(res, 400, "Validation failed", errorMessages);
    }
    
    next();
  };
};
