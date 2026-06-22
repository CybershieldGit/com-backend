import nodemailer from "nodemailer";
import config from "../config/config.js";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        type: "OAuth2",
        user: config.GOOGLE_USER,
        clientId: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        refreshToken: config.GOOGLE_REFRESH_TOKEN
    }
});

// Verify connection configuration
transporter.verify((error, success) => {
    if (error) {
        console.warn("Nodemailer verification failed (ensure GOOGLE_USER/REFRESH_TOKEN are valid in .env):", error.message);
    } else {
        console.log("Nodemailer is ready to send emails");
    }
});

export const sendEmail = async (to, subject, text, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Auth System" <${config.GOOGLE_USER}>`,
            to,
            subject,
            text,
            html
        });
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error("Error in sending email:", error);
        throw error;
    }
};
