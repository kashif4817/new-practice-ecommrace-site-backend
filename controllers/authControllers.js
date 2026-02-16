// authController.js
import bcrypt from "bcrypt";
import db from "../config/db.js";

const sendResponse = (res, statusCode, message, data = null) => {
  return res.status(statusCode).json({
    status: statusCode,
    message,
    data
  });
};

export const signup = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;

    // 1️⃣ Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // 2️⃣ Insert user
    const sql = `
      INSERT INTO users (full_name, phone, email, password_hash)
      VALUES (?, ?, ?, ?)
    `;

    await db.query(sql, [name, phone, email, passwordHash]);

    // 3️⃣ Success
    return sendResponse(res, 201, "Signup successful");

  } catch (error) {
    console.error("Signup error:", error);

    // 4️⃣ Duplicate email / phone
    if (error.code === "ER_DUP_ENTRY") {
      return sendResponse(res, 409, "Email or phone already exists");
    }

    // 5️⃣ Generic server error
    return sendResponse(res, 500, "Internal server error");
  }
};
