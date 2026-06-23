import jwt from "jsonwebtoken";
import config from "../config/config.js";

export function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Token not found",
        });
    }

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        req.user = { id: decoded.id };
        next();
    } catch {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
}
