
import express from "express";
import { signup } from "../controllers/authControllers.js";
import { signupSchema } from "../validations/auth.validation.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

router.post("/signup", validate(signupSchema), signup);
    
export default router;