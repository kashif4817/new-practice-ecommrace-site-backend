// authController.js
import bcrypt from "bcrypt";
import db from "../config/db.js";
import jwt, { decode } from 'jsonwebtoken';
import { sendEmail } from "../utils/sendEmail.js";
import { verifyEmailTemplate } from "../emails/verifyEmailTemplate.js";
import { forgotPasswordTemplate } from "../emails/forgotPasswordTemplate.js";


const sendResponse = (res, statusCode, message, data = null) => {
    return res.status(statusCode).json({
        success: statusCode >= 200 && statusCode < 300, // true if 2xx
        message,
        data // optional, can be undefined
    });
};

export const signup = async (req, res) => {
    console.log("signup api hit")
    try {
        const { name, phone, email, password } = req.body;
        console.log(req.body)

        const lowerCaseEmail = email.toLowerCase();
        const passwordHash = await bcrypt.hash(password, 12);

        const sql = `
      INSERT INTO users (full_name, phone, email, password_hash)
      VALUES (?, ?, ?, ?)
    `;

        await db.query(sql, [name, phone, lowerCaseEmail, passwordHash]);

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
    console.log("signin api hit")
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
            sendResponse(res, 200, "new token has been assinged", { newAccessToken });
        })

    } catch (error) {
        console.error(error);
        sendResponse(res, 500, "Internal server error");
    }
}


export const checkEmail = async (req, res) => {
    try {
        const { email } = req.body;
        console.log("req.body", req.body)
        const sql = 'SELECT * FROM users WHERE email = ? LIMIT 1';
        const [rows] = await db.query(sql, [email]);

        if (rows.length >= 1) {
            console.log("taken")
            return sendResponse(res, 409, "Email is already taken");
        }
        const user = rows[0];
        console.log(user)

        return sendResponse(res, 200, "Email is available");

    } catch (error) {
        sendResponse(res, 500, "Unable to check email right now. Please try again.")
        console.error(error);
    }
}


export const verifyEmail = async (req, res) => {
    try {
        const { email, id } = req.body;

        console.log("BODY:", req.body);

        const generateOTP = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(generateOTP);
        const otp_hash = await bcrypt.hash(generateOTP, 10)
        const sql = `INSERT INTO temp_otps (user_id, otp_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 2 MINUTE))`

        const [result] = await db.execute(sql, [id, otp_hash]);
        console.log('result', result);

        await sendEmail({
            to: email,
            subject: "Verify Your Email",
            html: verifyEmailTemplate(generateOTP)
        });
        return sendResponse(res, 200, "Email sent")

    } catch (error) {
        console.log('error', error)
        sendResponse(res, 500, "Unable to check email right now. Please try again.")
    }
}

export const forgetPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const sql = "select * from users where email = ? limit  1";
        const [rows] = await db.execute(sql, [email]);

        if (rows.length === 0) return sendResponse(res, 404, "Email not found!");
        const id = rows[0].id;

        const generateOTP = Math.floor(100000 + Math.random() * 900000).toString();
        const otp_hash = await bcrypt.hash(generateOTP, 10)
        const sql1 = `INSERT INTO temp_otps (user_id, otp_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 2 MINUTE))`
        const [result] = await db.execute(sql1, [id, otp_hash]);


        sendEmail({
            to: email,
            subject: "Forget password",
            html: forgotPasswordTemplate(generateOTP)
        })
        console.log('OTP sent')
        return sendResponse(res, 200, "OTP sent")

    } catch (error) {
        console.error("Error: ", error)
        sendResponse(res, 505, "An unexpected error occurred")
    }
}


export const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        if (!otp.trim()) return sendResponse(res, 400, "Otp is required");

        const sql = 'select * from temp_otps order by id desc limit 1';

        const [result] = await db.execute(sql)
        if (result.length === 0) return sendResponse(res, 404, "No otp found");


        const otp_hash = result[0].otp_hash;
        const isExpired = result[0].expires_at;


        if (isExpired < new Date()) return sendResponse(res, 400, "Otp has been expired");
        const compared = await bcrypt.compare(otp, otp_hash)
        if (!compared) return sendResponse(res, 400, "Invalid OTP code");
        return sendResponse(res, 200, "Otp found");


    } catch (error) {
        console.error("Error: ", error)
        sendResponse(res, 505, "An unexpected error occurred")
    }
}
