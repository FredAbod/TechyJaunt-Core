import { errorResMsg } from "../utils/lib/response.js";

export const validateRequest = (schema) => {
  return (req, res, next) => {
    console.log('=== VALIDATION MIDDLEWARE ===');
    console.log('Request URL:', req.originalUrl);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { error } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      console.log('Validation errors:', errorMessages);
      console.log('Schema keys expected:', Object.keys(schema.describe().keys || {}));
      return errorResMsg(res, 400, `Validation failed: ${errorMessages.join(', ')}`);
    }
    
    console.log('Validation passed');
    next();
  };
};
