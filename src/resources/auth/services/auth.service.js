import User from "../../user/models/user.js";
import bcrypt from "bcrypt";
import generateOtp from "../../../utils/OtpMessage.js";
import { sendOtpEmail, sendWelcomeOnboardingEmail } from "../../../utils/email/email-sender.js";
import { createJwtToken } from "../../../middleware/isAuthenticated.js";
import { successResMsg, errorResMsg } from "../../../utils/lib/response.js";

class AuthService {
  async registerUser(email) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      
      if (existingUser && existingUser.emailVerified) {
        throw new Error("User already exists with this email");
      }

      // Generate OTP
      const otp = generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      let user;
      if (existingUser) {
        // Update existing user with new OTP
        user = await User.findOneAndUpdate(
          { email },
          { 
            emailOtp: otp, 
            otpExpiresAt,
            status: "pending"
          },
          { new: true }
        );
      } else {
        // Create new user
        user = new User({
          email,
          emailOtp: otp,
          otpExpiresAt,
          status: "pending"
        });
        await user.save();
      }

      // Send OTP email
      await sendOtpEmail(email, otp);

      return {
        message: "Registration initiated. Please check your email for OTP verification.",
        email: user.email
      };
    } catch (error) {
      throw error;
    }
  }

  async verifyOtp(email, otp) {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        throw new Error("User not found");
      }

      if (!user.emailOtp || user.emailOtp !== otp) {
        throw new Error("Invalid OTP");
      }

      if (user.otpExpiresAt < new Date()) {
        throw new Error("OTP has expired");
      }

      // Mark email as verified and clear OTP
      user.emailVerified = true;
      user.emailOtp = undefined;
      user.otpExpiresAt = undefined;
      await user.save();

      return {
        message: "Email verified successfully. Please set your password.",
        email: user.email,
        verified: true
      };
    } catch (error) {
      throw error;
    }
  }

  async resendOtp(email) {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.emailVerified) {
        throw new Error("Email is already verified");
      }

      // Generate new OTP
      const otp = generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      user.emailOtp = otp;
      user.otpExpiresAt = otpExpiresAt;
      await user.save();

      // Send OTP email
      await sendOtpEmail(email, otp);

      return {
        message: "New OTP sent to your email",
        email: user.email
      };
    } catch (error) {
      throw error;
    }
  }

  async setPassword(email, password) {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        throw new Error("User not found");
      }

      if (!user.emailVerified) {
        throw new Error("Please verify your email first");
      }

      if (user.password) {
        throw new Error("Password already set for this account");
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update user with password and activate account
      user.password = hashedPassword;
      user.status = "active";
      await user.save();      // Send welcome email
      await sendWelcomeOnboardingEmail(email, user.firstName || "");

      // Generate JWT token
      const token = createJwtToken({ 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      });

      return {
        message: "Password set successfully. Welcome to TechyJaunt!",
        user: user.toJSON(),
        token
      };
    } catch (error) {
      throw error;
    }
  }

  async loginUser(email, password) {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        throw new Error("Invalid email or password");
      }

      if (!user.emailVerified) {
        throw new Error("Please verify your email first");
      }

      if (!user.password) {
        throw new Error("Please set your password first");
      }

      if (user.status === "suspended") {
        throw new Error("Your account has been suspended. Please contact support.");
      }

      if (user.status === "inactive") {
        throw new Error("Your account is inactive. Please contact support.");
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error("Invalid email or password");
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT token
      const token = createJwtToken({ 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      });

      return {
        message: "Login successful",
        user: user.toJSON(),
        token
      };
    } catch (error) {
      throw error;
    }
  }
}

export default new AuthService();
