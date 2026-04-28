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
  AWS_ACCESS_KEY_ID = "",
  AWS_SECRET_ACCESS_KEY = "",
  AWS_REGION = "us-east-1", // Default AWS region
  AWS_BUCKET_NAME = "",
  // Sender.net (email marketing / subscribers)
  SENDER_API_TOKEN = "",
  // Comma-separated group IDs (e.g. "eZVD4w,b2vAR1")
  SENDER_GROUP_IDS = "",
  // Optional: set to "true" to trigger Sender automations
  SENDER_TRIGGER_AUTOMATION = "false",
} = process.env;
