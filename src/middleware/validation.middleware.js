import { errorResMsg } from "../utils/lib/response.js";
import logger from "../utils/log/logger.js";

export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      // Keep logs lightweight; avoid logging full request bodies (may include secrets).
      logger.warn("Request validation failed", {
        path: req.originalUrl,
        errors: errorMessages,
      });
      return errorResMsg(res, 400, `Validation failed: ${errorMessages.join(', ')}`);
    }

    next();
  };
};
