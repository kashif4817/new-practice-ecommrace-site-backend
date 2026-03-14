
import express from "express";
import { signup, signin, refreshToken, checkEmail, verifyEmail, forgetPassword, logout, getMe, resetPassword, updatePassword, verifyOtpForgot, OtpSentSignup, verifyOtpSignup } from "../controllers/authControllers.js";
import { signupSchema, signinSchema, checkEmailSchema } from "../validations/auth.validation.js";
import { validate } from "../middleware/validate.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", validate(signupSchema), signup);
router.post("/signin", validate(signinSchema), signin);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);
router.post("/check-email", validate(checkEmailSchema), checkEmail);
router.post("/verify-email", verifyEmail)
router.post("/forget-password", validate(checkEmailSchema), forgetPassword)
router.post("/verify-otp-forgot", verifyOtpForgot);
router.post("/reset-password", authMiddleware, resetPassword);
router.get("/me", authMiddleware, getMe);
router.post("/update-password", updatePassword);
router.post("/otp-sent-signup", OtpSentSignup);
router.post("/verify-otp-signup", verifyOtpSignup);


export default router;