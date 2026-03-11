
import express from "express";
import { signup, signin, refreshToken, checkEmail, verifyEmail, forgetPassword, verifyOtp, updatePassword, logout } from "../controllers/authControllers.js";
import { signupSchema, signinSchema, checkEmailSchema } from "../validations/auth.validation.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

router.post("/signup", validate(signupSchema), signup);
router.post("/signin", validate(signinSchema), signin);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);
router.post("/check-email", validate(checkEmailSchema), checkEmail);
router.post("/verify-email", verifyEmail)
router.post("/forget-password", validate(checkEmailSchema), forgetPassword)
router.post("/verify-otp", verifyOtp);
router.post("/update-password", updatePassword);


export default router;