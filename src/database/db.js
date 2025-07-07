import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { sendServerFailure } from '../utils/email/email-sender.js';

const connectDB = async (url) => {
  mongoose.set('strictQuery', true);
  let retries = 3;
  while (retries) {
    try {
      await mongoose.connect(url);
      return;
    } catch (error) {
      console.log(`Database connection error: ${error.message}`);
      retries--;
      if (retries === 0) {
        await sendServerFailure(process.env.ADMIN_EMAIL);
        throw new Error(`Failed to connect to database after ${retries} attempts`);
      }
      console.log(`Retrying in 10 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

export default connectDB;
