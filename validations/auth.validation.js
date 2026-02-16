// validations/auth.validation.js
import { z } from "zod";

export const signupSchema = z.object({
  name: z.string()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name cannot exceed 100 characters"),

  email: z.string()
    .email("Invalid email format")
    .transform(val => val.toLowerCase().trim()),

  phone: z.string()
    .regex(/^[0-9]{10,15}$/, "Phone must be 10-15 digits"),

  password: z.string()
    .min(8, "Password must be at least 8 characters")
});
