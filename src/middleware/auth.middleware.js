import jwt from "jsonwebtoken";
import crypto from "crypto";
import config from "../config/config.js";
import sessionModel from "../models/session.model.js";

export async function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];

    if (token) {
        try {
            const decoded = jwt.verify(token, config.JWT_SECRET);
            req.user = { id: decoded.id };
            return next();
        } catch {
            // Access token failed verification, attempt automatic refresh below
        }
    }

    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({
            success: false,
            message: token ? "Invalid or expired token" : "Token not found",
        });
    }

    try {
        const decoded = jwt.verify(refreshToken, config.JWT_SECRET);
        const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

        const session = await sessionModel.findOne({
            refreshToken: refreshTokenHash,
            revoked: false,
        });

        if (!session) {
            return res.status(401).json({
                success: false,
                message: "Invalid session or session already revoked",
            });
        }

        const newAccessToken = jwt.sign(
            { id: decoded.id, sessionId: session._id },
            config.JWT_SECRET,
            { expiresIn: "15m" }
        );

        const newRefreshToken = jwt.sign(
            { id: decoded.id },
            config.JWT_SECRET,
            { expiresIn: "7d" }
        );
        const newRefreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");

        session.refreshToken = newRefreshTokenHash;
        session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await session.save();

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.setHeader("X-New-Access-Token", newAccessToken);
        req.user = { id: decoded.id };
        next();
    } catch {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired session. Please log in again.",
        });
    }
}

export function requireBearerToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Authorization header with Bearer token is required",
        });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Bearer token is missing",
        });
    }

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET);

        if (!decoded.id) {
            return res.status(401).json({
                success: false,
                message: "Invalid token payload",
            });
        }

        req.user = { id: decoded.id };
        next();
    } catch {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired access token. Please login again.",
        });
    }
}
