
import express from "express";
import { signup, signin } from "../controllers/authControllers.js";
import { signupSchema, signinSchema } from "../validations/auth.validation.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

router.post("/signup", validate(signupSchema), signup);
router.post("/signin", validate(signinSchema), signin);

export default router;