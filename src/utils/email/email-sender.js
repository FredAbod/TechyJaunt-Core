import nodemailer from "nodemailer";
import otpVerificationTemplate from "../templates/otp-verification-template.js";
import welcomeOnboardingTemplate from "../templates/welcome-onboarding-template.js";
import FgPasswordTemplate from "../templates/FgPassword-template.js";
import resetPasswordTemplate from "../templates/resetPassword-template.js";
import sessionBookingStudentTemplate from "../templates/session-booking-student-template.js";
import sessionBookingTutorTemplate from "../templates/session-booking-tutor-template.js";
import sessionBookingAdminTemplate from "../templates/session-booking-admin-template.js";
import sessionReminderStudentTemplate from "../templates/session-reminder-student-template.js";
import sessionReminderTutorTemplate from "../templates/session-reminder-tutor-template.js";

// Create a reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_NODEMAILER,
      pass: process.env.PASSWORD_NODEMAILER,
    },
  });
};

// Send OTP verification email for TechyJaunt
const sendOtpEmail = async (email, otp, firstName = "") => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"TechyJaunt Learning Platform" <${process.env.EMAIL_NODEMAILER}>`,
      to: email,
      subject: "Verify Your Email - TechyJaunt Registration",
      html: otpVerificationTemplate(firstName, otp),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `${new Date().toLocaleString()} - OTP Email sent successfully:`,
      info.response,
    );
  } catch (error) {
    console.log("OTP Email error:", error.message);
    throw new Error("Couldn't send OTP email.");
  }
};

// Send welcome email after successful registration
const sendWelcomeOnboardingEmail = async (email, firstName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"TechyJaunt Learning Platform" <${process.env.EMAIL_NODEMAILER}>`,
      to: email,
      subject: "Welcome to TechyJaunt Learning Platform!",
      html: welcomeOnboardingTemplate(firstName),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `${new Date().toLocaleString()} - Welcome Email sent successfully:`,
      info.response,
    );
  } catch (error) {
    console.log("Welcome Email error:", error.message);
    throw new Error("Couldn't send welcome email.");
  }
};

// Send reset password email with token
const sendResetPasswordEmail = async (email, firstName, resetToken) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"TechyJaunt Learning Platform" <${process.env.EMAIL_NODEMAILER}>`,
      to: email,
      subject: "Reset Your Password - TechyJaunt",
      html: FgPasswordTemplate(resetToken, firstName),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `${new Date().toLocaleString()} - Reset password email sent successfully:`,
      info.response,
    );
  } catch (error) {
    console.log("Reset password email error:", error.message);
    throw new Error("Couldn't send reset password email.");
  }
};

// Send password reset confirmation email
const sendPasswordResetConfirmationEmail = async (email, firstName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"TechyJaunt Learning Platform" <${process.env.EMAIL_NODEMAILER}>`,
      to: email,
      subject: "Password Reset Successful - TechyJaunt",
      html: resetPasswordTemplate(firstName),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `${new Date().toLocaleString()} - Password reset confirmation email sent successfully:`,
      info.response,
    );
  } catch (error) {
    console.log("Password reset confirmation email error:", error.message);
    throw new Error("Couldn't send password reset confirmation email.");
  }
};

// Send general email
const sendMail = async (to, subject, text, html = null) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"TechyJaunt Learning Platform" <${process.env.EMAIL_NODEMAILER}>`,
      to,
      subject,
      text,
      html: html || undefined,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.log("Email error:", error.message);
    throw new Error("Couldn't send email.");
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, firstName = "") => {
  try {
    const transporter = createTransporter();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"TechyJaunt Learning Platform" <${process.env.EMAIL_NODEMAILER}>`,
      to: email,
      subject: "Password Reset Request - TechyJaunt",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hello ${firstName},</p>
          <p>You requested a password reset for your TechyJaunt account.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>If you didn't request this, please ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
          <p>Best regards,<br>TechyJaunt Team</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `${new Date().toLocaleString()} - Password reset email sent successfully:`,
      info.response,
    );
  } catch (error) {
    console.log("Password reset email error:", error.message);
    throw new Error("Couldn't send password reset email.");
  }
};

// Send server failure notification email
const sendServerFailure = async (email, errorMessage) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"TechyJaunt System" <${process.env.EMAIL_NODEMAILER}>`,
      to: email,
      subject: "TechyJaunt - Server Issue Notification",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e74c3c;">Server Issue Alert</h2>
          <p>We've detected an issue with the TechyJaunt Learning Platform server.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Error Details:</strong><br>
            <code style="color: #e74c3c;">${errorMessage}</code>
          </div>
          <p>Our technical team has been notified and is working to resolve this issue.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message from TechyJaunt Learning Platform.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `${new Date().toLocaleString()} - Server failure email sent successfully:`,
      info.response,
    );
  } catch (error) {
    console.log("Server failure email error:", error.message);
    // Don't throw error here to avoid infinite loops
  }
};

// Send session booking confirmation email to student
const sendSessionBookingStudentEmail = async (
  studentEmail,
  studentName,
  tutorName,
  sessionDetails,
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"TechyJaunt Learning Platform" <${process.env.EMAIL_NODEMAILER}>`,
      to: studentEmail,
      subject: "Session Booking Confirmed - TechyJaunt",
      html: sessionBookingStudentTemplate(
        studentName,
        tutorName,
        sessionDetails,
      ),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `${new Date().toLocaleString()} - Session booking student email sent successfully:`,
      info.response,
    );
  } catch (error) {
    console.log("Session booking student email error:", error.message);
    throw new Error(
      "Couldn't send session booking confirmation email to student.",
    );
  }
};

// Send session booking notification email to tutor
const sendSessionBookingTutorEmail = async (
  tutorEmail,
  tutorName,
  studentName,
  sessionDetails,
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"TechyJaunt Learning Platform" <${process.env.EMAIL_NODEMAILER}>`,
      to: tutorEmail,
      subject: "New Session Booking - TechyJaunt",
      html: sessionBookingTutorTemplate(tutorName, studentName, sessionDetails),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `${new Date().toLocaleString()} - Session booking tutor email sent successfully:`,
      info.response,
    );
  } catch (error) {
    console.log("Session booking tutor email error:", error.message);
    throw new Error(
      "Couldn't send session booking notification email to tutor.",
    );
  }
};

// Send session booking notification email to admin
const sendSessionBookingAdminEmail = async (
  adminEmail,
  studentName,
  tutorName,
  sessionDetails,
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"TechyJaunt Learning Platform" <${process.env.EMAIL_NODEMAILER}>`,
      to: adminEmail,
      subject: "New Session Booking - Admin Notification",
      html: sessionBookingAdminTemplate(studentName, tutorName, sessionDetails),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `${new Date().toLocaleString()} - Session booking admin email sent successfully:`,
      info.response,
    );
  } catch (error) {
    console.log("Session booking admin email error:", error.message);
    // Don't throw error for admin notifications to avoid blocking booking process
  }
};

// Send session reminder email to student (2d / 1d / 1h / 10min)
const sendSessionReminderStudentEmail = async (
  studentEmail,
  studentName,
  tutorName,
  sessionDetails,
  reminderType,
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"TechyJaunt Learning Platform" <${process.env.EMAIL_NODEMAILER}>`,
      to: studentEmail,
      subject: `Session Reminder - ${reminderType} - TechyJaunt`,
      html: sessionReminderStudentTemplate(
        studentName,
        tutorName,
        sessionDetails,
        reminderType,
      ),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `${new Date().toLocaleString()} - Session reminder (student) email sent successfully:`,
      info.response,
    );
  } catch (error) {
    console.log("Session reminder (student) email error:", error.message);
    // Don't throw to avoid blocking reminder loop; just log
  }
};

// Send session reminder email to tutor (2d / 1d / 1h / 10min)
const sendSessionReminderTutorEmail = async (
  tutorEmail,
  tutorName,
  studentName,
  sessionDetails,
  reminderType,
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"TechyJaunt Learning Platform" <${process.env.EMAIL_NODEMAILER}>`,
      to: tutorEmail,
      subject: `Session Reminder - ${reminderType} - TechyJaunt`,
      html: sessionReminderTutorTemplate(
        tutorName,
        studentName,
        sessionDetails,
        reminderType,
      ),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `${new Date().toLocaleString()} - Session reminder (tutor) email sent successfully:`,
      info.response,
    );
  } catch (error) {
    console.log("Session reminder (tutor) email error:", error.message);
    // Don't throw to avoid blocking reminder loop; just log
  }
};

export {
  sendOtpEmail,
  sendWelcomeOnboardingEmail,
  sendMail,
  sendPasswordResetEmail,
  sendServerFailure,
  sendResetPasswordEmail,
  sendPasswordResetConfirmationEmail,
  sendSessionBookingStudentEmail,
  sendSessionBookingTutorEmail,
  sendSessionBookingAdminEmail,
  sendSessionReminderStudentEmail,
  sendSessionReminderTutorEmail,
};
