import userModel from "../models/user.model.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import sessionModel from "../models/session.model.js";
import { sendEmail } from "../services/email.service.js";
import { generateOtp, getOtpHtml } from "../utils/utils.js";
import otpModel from "../models/otp.model.js";


export async function register(req, res) {

    const { username, email, password } = req.body;

    const isAlreadyRegistered = await userModel.findOne({
        $or: [
            { username },
            { email }
        ]
    });

    if (isAlreadyRegistered) {
        return res.status(409).json({
            success: false,
            message: "User already registered"
        });
    }

    const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");

    const user = await userModel.create({
        username,
        email,
        password: hashedPassword
    });

    const otp = generateOtp();
    const html = getOtpHtml(otp);

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    await otpModel.create({
        email,
        user: user._id,
        otpHash
    });

    await sendEmail(email, "Verify your email", `Your OTP is ${otp}`, html);

    res.status(201).json({
        message: "User registered successfully",
        user: {
            username: user.username,
            email: user.email,
            verified: user.verified
        }
    })

}

export async function login(req, res) {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email })

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Invalid credentials"
        })
    }

    if (!user.verified) {
        return res.status(401).json({
            success: false,
            message: "Email is not verified"
        })
    }

    const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");

    const isPasswordValid = user.password === hashedPassword;

    if (!isPasswordValid) {
        return res.status(401).json({
            success: false,
            message: "Invalid credentials"
        })
    }

    const refreshToken = jwt.sign({
        id: user._id
    }, config.JWT_SECRET, {
        expiresIn: "7d"
    })
    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    const session = await sessionModel.create({
        user: user._id,
        refreshToken: refreshTokenHash,
        ip: req.ip || "127.0.0.1",
        userAgent: req.headers['user-agent'] || "Unknown",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    })

    const accessToken = jwt.sign({
        id: user._id,
        sessionId: session._id
    }, config.JWT_SECRET,
        { expiresIn: "15m" }
    )
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000//7 days
    })
    res.status(200).json({
        success: true,
        message: "User logged in successfully",
        user: {
            username: user.username,
            email: user.email,
        },
        accessToken
    })

}

export async function getMe(req, res) {

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Token not found"
        })
    }
    const decoded = jwt.verify(token, config.JWT_SECRET);

    const user = await userModel.findById(decoded.id)

    res.status(200).json({
        success: true,
        message: "user fetched successfully",
        user: {
            username: user.username,
            email: user.email
        }
    })

}

export async function refreshToken(req, res) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({
            success: false,
            message: "Refresh token not found"
        })
    }

    const decoded = jwt.verify(refreshToken, config.JWT_SECRET);

    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    const session = await sessionModel.findOne({
        refreshToken: refreshTokenHash,
        revoked: false
    })

    if (!session) {
        return res.status(401).json({
            success: false,
            message: "Invalid session or session already revoked"
        })
    }

    const accessToken = jwt.sign(
        {
            id: decoded.id
        },
        config.JWT_SECRET,
        {
            expiresIn: "15m"
        }
    )

    const newRefreshToken = jwt.sign(
        { id: decoded.id },
        config.JWT_SECRET,
        { expiresIn: "7d" }
    )

    const newRefreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");

    session.refreshToken = newRefreshTokenHash;
    await session.save();

    res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
    })


    res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.status(200).json({
        success: true,
        message: "Access token refreshed successfully",
        accessToken
    })
}

export async function logout(req, res) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(400).json({
            success: false,
            message: "Refresh token not found"
        })
    }
    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    const session = await sessionModel.findOne({
        refreshToken: refreshTokenHash,
        revoked: false
    })

    if (!session) {
        return res.status(400).json({
            success: false,
            message: "Invalid session or session already revoked"
        })
    }

    session.revoked = true;
    await session.save();

    res.clearCookie("refreshToken");

    res.status(200).json({
        success: true,
        message: "Logout successful"
    })
}

export async function logoutAll(req, res) {

    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({
            success: false,
            message: "Refresh token not found"
        })
    }

    const decoded = jwt.verify(refreshToken, config.JWT_SECRET);

    await sessionModel.updateMany({
        user: decoded.id,
        revoked: false
    }, {
        revoked: true
    })

    res.clearCookie("refreshToken");

    res.status(200).json({
        success: true,
        message: "Logout successful from all sessions"
    })
}

export async function verifyEmail(req, res) {
    const { otp, email } = req.body;

    if (!otp || !email) {
        return res.status(400).json({
            success: false,
            message: "OTP and email are required"
        })
    }

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    const otpDoc = await otpModel.findOne({
        email,
        otpHash
    });

    if (!otpDoc) {
        return res.status(400).json({
            success: false,
            message: "OTP is not valid or has expired"
        })
    }

    const user = await userModel.findByIdAndUpdate(otpDoc.user, {
        verified: true,
    }, { new: true });

    await otpModel.deleteMany({
        user: otpDoc.user
    });

    return res.status(200).json({
        success: true,
        message: "Email verified successfully",
        user: {
            username: user?.username,
            email: user?.email,
            verified: user?.verified
        }
    })
}