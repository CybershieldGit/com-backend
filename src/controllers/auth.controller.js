import userModel from "../models/user.model.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";


export async function register(req, res) {

    const { username, email, password } = req.body;

    const isAlreadyRegistered = await userModel.findOne({
        $or: [
            { username },
            { email }
        ]
    });

    if (isAlreadyRegistered) {
        res.status(409).json({
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

    if (user) {
        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user
        });
    } else {
        res.status(500).json({
            success: false,
            message: "Failed to register user"
        });
    }

}