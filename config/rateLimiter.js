import rateLimit from "express-rate-limit";
import { sendResponse } from "../utils/sendResponse.js";

export const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    limit: 10, // each IP can make up to 10 requests per `windowsMs` (5 minutes)
    message: {
        success: false,
        message: "Too many requests. Please try again later."
    },
    standardHeaders: true, // add the `RateLimit-*` headers to the response
    legacyHeaders: false, // remove the `X-RateLimit-*` headers from the response
})


export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,

    handler: (req, res) => {
        const retryAfter = Math.ceil(
            (req.rateLimit.resetTime.getTime() - Date.now()) / 1000
        );

        const retryAfterMinutes = Math.ceil(retryAfter / 60);

        sendResponse(res, 429, `Too many requests. Try again after ${retryAfterMinutes} minutes`)

    }
})
