import jwt from 'jsonwebtoken'
import { sendResponse } from '../utils/sendResponse.js';

export const authMiddleware = (req, res, next) => {
    console.log("entered in middle ware")
    console.log(req.cookies);
    const token = req.cookies.token;
    console.log('token', token)

    if (!token) return sendResponse(res, 401, "No token found or Unauthorized");

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        console.log('decoded', decoded);
        req.id = decoded.id;

        next();
    } catch (error) {
        console.error(error)
        sendResponse(res, 401, "Invalid token")
    }
}