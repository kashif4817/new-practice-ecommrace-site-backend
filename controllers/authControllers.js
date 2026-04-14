import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import supabase from "../config/supabase.js";
import { sendEmail } from "../utils/sendEmail.js";
import { verifyEmailTemplate } from "../emails/verifyEmailTemplate.js";
import { forgotPasswordTemplate } from "../emails/forgotPasswordTemplate.js";
import { signupVerifyTemplate } from "../emails/signupOtpVerifyTemplate.js";
import { sendResponse } from "../utils/sendResponse.js";

export const getMe = async (req, res) => {
  const id = req.id;
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("id, full_name, phone, email")
      .eq("id", id)
      .single();

    if (error || !user) return sendResponse(res, 404, "No data found");

    sendResponse(res, 200, "Data fetch successfully", {
      id: user.id,
      full_name: user.full_name,
      phone: user.phone,
      email: user.email,
    });
  } catch (error) {
    console.error(error);
    return sendResponse(res, 500, "Internal server error");
  }
};

export const signup = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;

    const lowerCaseEmail = email.toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);

    const { error } = await supabase.from("users").insert([
      {
        full_name: name,
        phone,
        email: lowerCaseEmail,
        password_hash: passwordHash,
      },
    ]);

    if (error) {
      // Supabase unique constraint error code
      if (error.code === "23505") {
        return sendResponse(res, 409, "Email or phone already exists");
      }
      throw error;
    }

    return sendResponse(res, 201, "Signup successful");
  } catch (error) {
    console.error("Signup error:", error);
    return sendResponse(res, 500, "Internal server error");
  }
};

export const signin = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) return sendResponse(res, 401, "Invalid credentials");

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      await supabase
        .from("users")
        .update({ login_attempts: user.login_attempts + 1 })
        .eq("email", email);

      if (user.login_attempts + 1 >= 5) {
        await supabase
          .from("users")
          .update({ temp_block: true, block_time: new Date().toISOString() })
          .eq("id", user.id);

        return sendResponse(
          res,
          429,
          "Too many failed attempts. You are blocked for 15 minutes.",
        );
      }
      return sendResponse(res, 401, `Invalid credentials.`);
    }

    await supabase
      .from("users")
      .update({ login_attempts: 0, temp_block: false, block_time: null })
      .eq("id", user.id);

    const accessToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );

    const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_IN,
    });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);

    await supabase
      .from("users")
      .update({ refresh_token: hashedRefreshToken })
      .eq("id", user.id);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: rememberMe ? 15 * 60 * 1000 : undefined,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : undefined,
    });

    return sendResponse(res, 201, "Signin successful", {
      user: {
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Signin error:", error);
    return sendResponse(res, 500, "Internal server error");
  }
};

export const logout = async (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  });
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  });
  sendResponse(res, 200, "Logged out successfully");
};

export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) return sendResponse(res, 403, "No refresh token found");

    const decoded = jwt.verify(token, process.env.REFRESH_SECRET);

    const { data, error } = await supabase
      .from("users")
      .select("refresh_token")
      .eq("id", decoded.id)
      .single();

    if (error || !data) return sendResponse(res, 403, "User not found");

    const isMatch = await bcrypt.compare(token, data.refresh_token);
    if (!isMatch) return sendResponse(res, 403, "Invalid refresh token");

    const newAccessToken = jwt.sign(
      { id: decoded.id, email: decoded.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 15 * 60 * 1000,
    });

    return sendResponse(res, 200, "New access token has been assigned");
  } catch (error) {
    sendResponse(res, 500, "Internal server error");
  }
};

export const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (data) {
      return sendResponse(res, 409, "Email is already taken");
    }

    return sendResponse(res, 200, "Email is available");
  } catch (error) {
    sendResponse(
      res,
      500,
      "Unable to check email right now. Please try again.",
    );
    console.error(error);
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { email, id } = req.body;

    const generateOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const otp_hash = await bcrypt.hash(generateOTP, 10);

    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from("temp_otps")
      .insert([{ user_id: id, otp_hash, expires_at: expiresAt }]);

    if (error) throw error;

    await sendEmail({
      to: email,
      subject: "Verify Your Email",
      html: verifyEmailTemplate(generateOTP),
    });

    return sendResponse(res, 200, "Email sent");
  } catch (error) {
    console.error(error);
    sendResponse(
      res,
      500,
      "Unable to check email right now. Please try again.",
    );
  }
};

export const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const { data: user, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (error || !user) return sendResponse(res, 404, "Email not found!");

    const generateOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const otp_hash = await bcrypt.hash(generateOTP, 10);

    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from("temp_otps")
      .insert([{ user_id: user.id, otp_hash, expires_at: expiresAt }]);

    if (insertError) throw insertError;

    sendEmail({
      to: email,
      subject: "Forget password",
      html: forgotPasswordTemplate(generateOTP),
    });

    return sendResponse(res, 200, "OTP sent", { email });
  } catch (error) {
    console.error("Error: ", error);
    sendResponse(res, 500, "An unexpected error occurred");
  }
};

export const verifyOtpForgot = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp.trim()) return sendResponse(res, 400, "Otp is required");

    const { data, error } = await supabase
      .from("temp_otps")
      .select("*")
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return sendResponse(res, 404, "No otp found");

    const isExpired = new Date(data.expires_at);
    if (isExpired < new Date())
      return sendResponse(res, 400, "Otp has been expired");

    const compared = await bcrypt.compare(otp, data.otp_hash);
    if (!compared) return sendResponse(res, 400, "Invalid OTP code");

    return sendResponse(res, 200, "Otp found");
  } catch (error) {
    console.error("Error: ", error);
    sendResponse(res, 500, "An unexpected error occurred");
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const id = req.id;

    if (currentPassword === newPassword)
      return sendResponse(res, 401, "current and new password cannot be same");

    const { data: user, error } = await supabase
      .from("users")
      .select("password_hash")
      .eq("id", id)
      .single();

    if (error || !user) return sendResponse(res, 404, "No user found");

    const compared = await bcrypt.compare(currentPassword, user.password_hash);
    if (!compared)
      return sendResponse(res, 404, "Current password is incorrect");

    const newHashPassword = await bcrypt.hash(newPassword, 12);

    const { error: updateError } = await supabase
      .from("users")
      .update({ password_hash: newHashPassword })
      .eq("id", id);

    if (updateError)
      return sendResponse(res, 404, "User not found or password not updated");

    return sendResponse(res, 201, "Password updated successfully");
  } catch (error) {
    console.error("Error: ", error);
    sendResponse(res, 500, "An unexpected error occurred");
  }
};

export const updatePassword = async (req, res) => {
  const { email, password } = req.body;

  if (!password) return sendResponse(res, 401, "password is required");

  const password_hash = await bcrypt.hash(password, 12);

  const { data, error } = await supabase
    .from("users")
    .update({ password_hash })
    .eq("email", email)
    .select();

  if (error || !data || data.length === 0) {
    return sendResponse(res, 404, "User not found");
  }

  return sendResponse(res, 200, "Password updated successfully");
};

export const OtpSentSignup = async (req, res) => {
  try {
    const { email } = req.body;

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) return sendResponse(res, 409, "Email is already taken");

    const generateOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const otp_hash = await bcrypt.hash(generateOTP, 10);

    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from("temp_otps")
      .insert([{ email, otp_hash, expires_at: expiresAt }]);

    if (error) throw error;

    sendEmail({
      to: email,
      subject: "Signup Verification",
      html: signupVerifyTemplate(generateOTP),
    });

    return sendResponse(res, 200, "OTP sent", { email });
  } catch (error) {
    console.error("Error: ", error);
    sendResponse(res, 500, "An unexpected error occurred");
  }
};

export const verifyOtpSignup = async (req, res) => {
  try {
    const { otp, email } = req.body;

    if (!otp.trim()) return sendResponse(res, 400, "Otp is required");

    const { data, error } = await supabase
      .from("temp_otps")
      .select("*")
      .eq("email", email)
      .is("user_id", null)
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return sendResponse(res, 404, "No otp found");

    const isExpired = new Date(data.expires_at);
    if (isExpired < new Date())
      return sendResponse(res, 400, "Otp has been expired");

    const compared = await bcrypt.compare(otp, data.otp_hash);
    if (!compared) return sendResponse(res, 400, "Invalid OTP code");

    return sendResponse(res, 200, "Otp found");
  } catch (error) {
    console.error("Error: ", error);
    sendResponse(res, 500, "An unexpected error occurred");
  }
};
