import AuthService from "../services/auth.service.js";
import { successResMsg, errorResMsg } from "../../../utils/lib/response.js";
import logger from "../../../utils/log/logger.js";

export const registerUser = async (req, res) => {
  try {
    const { email } = req.body;
    
    const result = await AuthService.registerUser(email);
    
    logger.info(`Registration initiated for email: ${email}`);
    return successResMsg(res, 200, result);
    
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const result = await AuthService.verifyOtp(email, otp);
      logger.info(`OTP verified successfully for email: ${email}`);
    return successResMsg(res, 200, result);
    
  } catch (error) {
    logger.error(`OTP verification error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    
    const result = await AuthService.resendOtp(email);
      logger.info(`OTP resent for email: ${email}`);
    return successResMsg(res, 200, result);
    
  } catch (error) {
    logger.error(`Resend OTP error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

export const setPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await AuthService.setPassword(email, password);
      logger.info(`Password set successfully for email: ${email}`);
    return successResMsg(res, 200, result);
    
  } catch (error) {
    logger.error(`Set password error: ${error.message}`);
    return errorResMsg(res, 400, error.message);
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await AuthService.loginUser(email, password);
      logger.info(`User logged in successfully: ${email}`);
    return successResMsg(res, 200, result);
    
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    return errorResMsg(res, 401, error.message);
  }
};
