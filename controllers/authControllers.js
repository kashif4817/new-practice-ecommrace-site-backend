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

        
        const passwordHash = await bcrypt.hash(password, 12);

        const sql = `
      INSERT INTO users (full_name, phone, email, password_hash)
      VALUES (?, ?, ?, ?)
    `;

        await db.query(sql, [name, phone, email, passwordHash]);

        return sendResponse(res, 201, "Signup successful");

    } catch (error) {
        console.error("Signup error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return sendResponse(res, 409, "Email or phone already exists");
        }

        return sendResponse(res, 500, "Internal server error");
    }
};


export const signin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const sql = 'SELECT * FROM users WHERE email = ? LIMIT 1';
        const [rows] = await db.query(sql, [email]);

        if (rows.length === 0) {
            return sendResponse(res, 500, "Invalid credentials");
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return sendResponse(res, 500, "Invalid credentials");
        }
        return sendResponse(res, 201, "Signin successful");

    } catch (error) {
        console.error("Signup error:", error);
        return sendResponse(res, 500, "Internal server error");
    }

}
