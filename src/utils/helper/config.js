import dotenv from "dotenv";

dotenv.config();

export const {
  PAYSTACK_SECRET_KEY,
  FRONTEND_URL,
  NODE_ENV,
  DB_URL,
  DB_TEST_URL,
  DB_PROD_URL,
  PORT,
  SECRET,
  EMAIL_USERNAME,
  EMAIL_PASSWORD,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;
