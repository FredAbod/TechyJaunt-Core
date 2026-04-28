import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TechyJaunt API',
      version: '1.0.0',
      description: 'Complete Learning Management System API',
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:4000',
        description: 'Development server',
      },
      {
        url: 'https://techyjaunt-core-tvr6.onrender.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/resources/auth/routes/*.js',
    './src/resources/user/routes/*.js',
    './src/resources/courses/routes/*.js',
    './src/resources/payments/routes/*.js',
    './src/resources/bookings/routes/*.js',
    './src/resources/ai-tutor/routes/*.js',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
