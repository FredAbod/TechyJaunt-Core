import User from "../../user/models/user.js";
import bcrypt, { hash } from "bcrypt";
import generateOtp from "../../../utils/OtpMessage.js";
import { sendOtpEmail, sendWelcomeOnboardingEmail, sendResetPasswordEmail, sendPasswordResetConfirmationEmail } from "../../../utils/email/email-sender.js";
import { createJwtToken } from "../../../middleware/isAuthenticated.js";
import { successResMsg, errorResMsg } from "../../../utils/lib/response.js";

// Helper function to check if profile is complete
const isProfileComplete = (user) => {
  return !!(user.firstName && user.lastName && user.phone);
};

class AuthService {  async registerUser(email) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      
      if (existingUser && existingUser.emailVerified) {
        throw new Error("User already exists with this email");
      }

      // Check if user exists but unverified and still has valid OTP
      if (existingUser && !existingUser.emailVerified && existingUser.otpExpiresAt > new Date()) {
        throw new Error("OTP already sent to this email. Please check your inbox or wait for it to expire before requesting a new one.");
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

      // Generate JWT token and calculate expiry
      const token = createJwtToken({ 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      });
      const expiresIn = 48 * 60 * 60 * 1000; // 2 days in milliseconds
      const expiresAt = new Date(Date.now() + expiresIn).toISOString();

      return {
        message: "Password set successfully. Welcome to TechyJaunt!",
        user: user.toJSON(),
        token,
        tokenExpiresAt: expiresAt
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

      // Update last login and check profile completion
      user.lastLogin = new Date();
      user.profileCompleted = isProfileComplete(user);
      await user.save();

      // Generate JWT token and calculate expiry
      const token = createJwtToken({ 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      });
      const expiresIn = 48 * 60 * 60 * 1000; // 2 days in milliseconds
      const expiresAt = new Date(Date.now() + expiresIn).toISOString();

      return {
        message: "Login successful",
        user: user.toJSON(),
        token,
        tokenExpiresAt: expiresAt
      };
    } catch (error) {
      throw error;
    }
  }

  async forgotPassword(email) {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        throw new Error("User with this email does not exist");
      }

      if (user.status !== 'active') {
        throw new Error("Please complete your email verification first");
      }

      // Generate reset token (6-digit code)
      const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
      const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Save reset token to user
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpiry = resetTokenExpiry;
      await user.save();

      // Send reset password email
      await sendResetPasswordEmail(user.email, user.firstName || "User", resetToken);

      return {
        message: "Password reset code sent to your email",
        email: email
      };
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(email, resetToken, newPassword) {
    try {
      const user = await User.findOne({ 
        email: email.toLowerCase(),
        resetPasswordToken: resetToken,
        resetPasswordExpiry: { $gt: new Date() }
      });

      if (!user) {
        throw new Error("Invalid or expired reset token");
      }

      // Hash new password
      const hashedPassword = await hash(newPassword, 12);

      // Update user password and clear reset token
      user.password = hashedPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpiry = undefined;
      user.lastLogin = new Date();
      await user.save();

      // Generate new JWT token and calculate expiry
      const token = createJwtToken({ 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      });
      const expiresIn = 48 * 60 * 60 * 1000; // 2 days in milliseconds
      const expiresAt = new Date(Date.now() + expiresIn).toISOString();

      // Send password reset confirmation email
      await sendPasswordResetConfirmationEmail(user.email, user.firstName || "User");

      return {
        message: "Password reset successfully. You are now logged in.",
        user: user.toJSON(),
        token,
        tokenExpiresAt: expiresAt
      };
    } catch (error) {
      throw error;
    }
  }
}

export default new AuthService();
