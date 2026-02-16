// authController.js
import bcrypt from "bcrypt";
import db from "../config/db.js";
import jwt, { decode } from 'jsonwebtoken';

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
        console.log(user)
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return sendResponse(res, 500, "Invalid credentials");
        }

        const accessToken = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );
        console.log('accessToken', accessToken);

        const refreshToken = jwt.sign(
            { id: user.id },
            process.env.REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_IN }
        );
        console.log('refreshToken', refreshToken);


        await db.query("UPDATE users SET refresh_token = ? WHERE id = ?", [refreshToken, user.id]);
        return sendResponse(res, 201, "Signin successful", { accessToken });

    } catch (error) {
        console.error("Signup error:", error);
        return sendResponse(res, 500, "Internal server error");
    }

}


export const refreshToken = async (req, res) => {
    try {
        const { id } = req.body;

        const sql = "SELECT refresh_token FROM users WHERE id = ? LIMIT 1";
        const [result] = await db.query(sql, [id]);

        if (result.length === 0) return sendResponse(res, 401, "User not found");

        const savedToken = result[0].refresh_token;

        if (!savedToken) return sendResponse(res, 403, "No refresh token found");

        jwt.verify(savedToken, process.env.REFRESH_SECRET, (err, decoded) => {
            if (err) return sendResponse(res, 403, "Invalid refresh token");
            console.log('decoded', decoded);
            const newAccessToken = jwt.sign(
                { id: decoded.id },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            )
          console.log('newAccessToken', newAccessToken)
            sendResponse(res, 200,"new token has been assinged", {newAccessToken});
        })

    } catch (error) {
        console.error(error);
        sendResponse(res, 500, "Internal server error");
    }
}