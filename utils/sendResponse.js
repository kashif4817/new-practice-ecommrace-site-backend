
export const sendResponse = (res, statusCode, message, data = null) => {
    return res.status(statusCode).json({
        success: statusCode >= 200 && statusCode < 300, // true if 2xx
        message,
        data // optional, can be undefined
    });
};