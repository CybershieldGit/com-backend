import rateLimit from "express-rate-limit";
import config from "../config/config.js";

export const globalLimiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    limit: config.RATE_LIMIT_MAX,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
    message: {
        status: 429,
        message: "Too many requests from this IP, please try again later."
    }
});
