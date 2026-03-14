// authController.js
import bcrypt from "bcrypt";
import db from "../config/db.js";
import jwt, { decode } from 'jsonwebtoken';
import { sendEmail } from "../utils/sendEmail.js";
import { verifyEmailTemplate } from "../emails/verifyEmailTemplate.js";
import { forgotPasswordTemplate } from "../emails/forgotPasswordTemplate.js";
import { signupVerifyTemplate } from "../emails/signupOtpVerifyTemplate.js";
import { sendResponse } from "../utils/sendResponse.js";



export const getMe = async (req, res) => {
    const id = req.id
    console.log(id);
    try {
        const sql = "select * from users where id = ? limit 1";

        const [result] = await db.execute(sql, [id]);
        console.log('result', result)
        console.log('result[0]', result[0])
        if (result.length === 0) return sendResponse(res, 404, "No data found");

        const user = result[0];
        sendResponse(res, 200, "Data fetch successfully", {
            id: user.id,
            full_name: user.full_name,
            phone: user.phone,
            email: user.email
        })
    } catch (error) {
        console.error(error)
        return sendResponse(res, 500, "Internal server error");
    }
}


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
        const { email, password, rememberMe } = req.body;
        console.log(req.body);

        const sql = 'SELECT * FROM users WHERE email = ? LIMIT 1';
        const [rows] = await db.query(sql, [email]);

        if (rows.length === 0) return sendResponse(res, 500, "Invalid credentials")

        const user = rows[0];
        console.log(user)
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            await db.execute('UPDATE users SET login_attempts = login_attempts + 1 WHERE email = ?', [email])

            if (user.login_attempts + 1 >= 5) {
                await db.execute('UPDATE users SET temp_block = 1, block_time = NOW() WHERE id = ?', [user.id]);
                return sendResponse(res, 429, 'Too many failed attempts. You are blocked for 15 minutes.');
            }
            return sendResponse(res, 401, `Invalid credentials.`);
            // return sendResponse(res, 401, `Invalid credentials. ${4 - user.login_attempts} attempt(s) remaining.`);
        }

        await db.execute('UPDATE users SET login_attempts = 0, temp_block = 0, block_time = NULL WHERE id = ?', [user.id]);


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

        const cookieOptions = {
            httpOnly: true,  // cannot be accessed by JS
            secure: false,   // true in production with HTTPS
            sameSite: "Lax",
            maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : undefined
        };

        console.log('cookieOptions', cookieOptions);
        // if (rememberMe) cookieOptions.maxAge = 7 * 24 * 60 * 60 * 1000;


        res.cookie("token", accessToken, cookieOptions);
        return sendResponse(res, 201, "Signin successful", {
            user: {
                id: user.id,
                full_name: user.full_name,
                phone: user.phone,
                email: user.email
            }, accessToken
        });

    } catch (error) {
        console.error("Signup error:", error);
        return sendResponse(res, 500, "Internal server error");
    }
}



export const logout = async (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: false,
        sameSite: "Lax"
    })
    sendResponse(res, 200, "Logged out successfully")
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
        console.log('req.body')
        console.log(req.body);
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
        return sendResponse(res, 200, "OTP sent", { email })

    } catch (error) {
        console.error("Error: ", error)
        sendResponse(res, 505, "An unexpected error occurred")
    }
}


export const verifyOtpForgot = async (req, res) => {
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



export const resetPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const id = req.id;

        if (currentPassword === newPassword) return sendResponse(res, 401, "current and new password cannot be same")

        const sql = "select password_hash from users where id = ? limit 1";
        const [result] = await db.execute(sql, [id]);

        if (result.length === 0) return sendResponse(res, 404, 'No user found');
        const password_hash = result[0].password_hash;

        const compared = await bcrypt.compare(currentPassword, password_hash);

        if (!compared) return sendResponse(res, 404, "Current password is incorrect");

        const newHashPassword = await bcrypt.hash(newPassword, 12)
        const sql1 = "UPDATE users SET password_hash = ? WHERE id = ?";
        const [result1] = await db.execute(sql1, [newHashPassword, id]);
        if (result1.affectedRows === 0) {
            return sendResponse(res, 404, "User not found or password not updated");
        }
        return sendResponse(res, 201, "Password updated successfully");
    } catch (error) {
        console.error("Error: ", error)
        sendResponse(res, 505, "An unexpected error occurred")
    }
}


export const updatePassword = async (req, res) => {
    console.log(req.body)
    const { email, password } = req.body;

    if (!password) return sendResponse(res, 401, "password is required");

    const password_hash = await bcrypt.hash(password, 12);
    console.log(password_hash)
    const sql = "UPDATE users SET password_hash = ? WHERE email = ?";

    const [result] = await db.execute(sql, [password_hash, email]);
    console.log(result);

    if (result.affectedRows === 0) {
        return sendResponse(res, 404, "User not found");
    }

    return sendResponse(res, 200, "Password updated successfully");
}


export const OtpSentSignup = async (req, res) => {

    try {

        const { email } = req.body;
        console.log("req.body", req.body)

        const sql = 'SELECT * FROM users WHERE email = ? LIMIT 1';
        const [rows] = await db.query(sql, [email]);
        if (rows.length >= 1) return sendResponse(res, 409, "Email is already taken");

        console.log(rows);
        const generateOTP = Math.floor(100000 + Math.random() * 900000).toString();
        console.log("otp:", generateOTP);
        const otp_hash = await bcrypt.hash(generateOTP, 10)
        const sql1 = `INSERT INTO temp_otps ( email,otp_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 2 MINUTE))`
        const [result] = await db.execute(sql1, [email, otp_hash]);
        console.log(result)


        sendEmail({
            to: email,
            subject: "Signup Verification",
            html: signupVerifyTemplate(generateOTP)
        })
        console.log('OTP sent')
        return sendResponse(res, 200, "OTP sent", { email })

    } catch (error) {
        console.error("Error: ", error)
        sendResponse(res, 505, "An unexpected error occurred")
    }

}



export const verifyOtpSignup = async (req, res) => {
    try {
        const { otp, email } = req.body;
        console.log('req.body', req.body);

        if (!otp.trim()) return sendResponse(res, 400, "Otp is required");

        const sql = 'SELECT * FROM temp_otps WHERE email = ? AND user_id IS NULL ORDER BY id DESC LIMIT 1;';

        const [result] = await db.execute(sql, [email])
        if (result.length === 0) return sendResponse(res, 404, "No otp found");
        console.log(result);
        console.log(result[0].otp_hash);

        const otp_hash = result[0].otp_hash;
        const isExpired = result[0].expires_at;

        const compared = await bcrypt.compare(otp, otp_hash)
        if (!compared) return sendResponse(res, 400, "Invalid OTP code");

        if (isExpired < new Date()) return sendResponse(res, 400, "Otp has been expired");


        return sendResponse(res, 200, "Otp found");

    } catch (error) {
        console.error("Error: ", error)
        sendResponse(res, 505, "An unexpected error occurred")
    }
}
