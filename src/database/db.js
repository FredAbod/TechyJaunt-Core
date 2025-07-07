import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { sendServerFailure } from '../utils/email/email-sender.js';

const connectDB = async (url) => {
  mongoose.set('strictQuery', true);
  
  // Enhanced connection options to prevent ECONNRESET errors
  const options = {
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4, // Use IPv4, skip trying IPv6
    maxPoolSize: 10, // Maintain up to 10 socket connections
    minPoolSize: 5, // Maintain a minimum of 5 socket connections
    maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  };

  let retries = 3;
  while (retries) {
    try {
      await mongoose.connect(url, options);
      
      // Set up event handlers for connection
      mongoose.connection.on('error', (err) => {
        console.log(`MongoDB connection error: ${err.message}`);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected! Attempting to reconnect...');
      });
      
      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected successfully');
      });
      
      return;
    } catch (error) {
      console.log(`Database connection error: ${error.message}`);
      retries--;
      if (retries === 0) {
        await sendServerFailure(process.env.ADMIN_EMAIL);
        throw new Error(`Failed to connect to database after 3 attempts`);
      }
      console.log(`Retrying in 10 seconds... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

export default connectDB;
