import jwt from 'jsonwebtoken'
import { sendResponse } from "../controllers/authControllers";


export const authMiddleware = (req, res, next) => {
    console.log(cookies);
    const token = req.cookies.accessToken;

    if (!token) return sendResponse(res, 404, "No token found or Unauthorized");

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        console.log('decoded', decoded);
        req.userId = decoded.id;

        next();
    } catch (error) {
        console.error(error)
        sendResponse(res, 401, "Invalid token")
    }


}