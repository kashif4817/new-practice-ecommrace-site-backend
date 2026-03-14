import xss from "xss";

export const sanitizeInput = (req, res, next) => {
    for (let key in req.body) {
        if (typeof req.body[key] === 'string') {
            req.body[key] = xss(req.body[key]);
        }
    }
    next();
};