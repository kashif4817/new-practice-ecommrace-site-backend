import jwt from 'jsonwebtoken'
import { sendResponse } from '../utils/sendResponse.js';

export const authMiddleware = (req, res, next) => {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) return sendResponse(res, 401, "No token found or Unauthorized");

    try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET)
        req.id = decoded.id;
        next();
    } catch (error) {
        console.error(error)
        sendResponse(res, 401, "Invalid token")
    }
}
