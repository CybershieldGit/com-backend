export function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getOtpHtml(otp) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OTP Verification</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
            body {
                font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #0b0f19;
                color: #f3f4f6;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }
            .container {
                max-width: 500px;
                width: 100%;
                margin: 40px auto;
                padding: 40px;
                background: rgba(17, 24, 39, 0.7);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                text-align: center;
            }
            .logo {
                font-size: 28px;
                font-weight: 700;
                background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 30px;
                letter-spacing: -0.5px;
            }
            h1 {
                font-size: 22px;
                font-weight: 600;
                color: #ffffff;
                margin-top: 0;
                margin-bottom: 12px;
            }
            p {
                font-size: 15px;
                line-height: 1.6;
                color: #9ca3af;
                margin-bottom: 30px;
            }
            .otp-container {
                position: relative;
                padding: 2px;
                background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
                border-radius: 14px;
                display: inline-block;
                margin-bottom: 30px;
            }
            .otp {
                font-size: 32px;
                font-weight: 700;
                letter-spacing: 8px;
                color: #ffffff;
                background: #111827;
                padding: 14px 28px;
                border-radius: 12px;
                display: block;
                font-family: 'Courier New', Courier, monospace;
            }
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.06);
                font-size: 13px;
                color: #6b7280;
            }
            .highlight {
                color: #818cf8;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">CYBERSHIELD</div>
            <h1>Verification Required</h1>
            <p>To finish setting up your account, please enter the One-Time Password (OTP) code below. This code is only valid for <span class="highlight">5 minutes</span>.</p>
            <div class="otp-container">
                <span class="otp">${otp}</span>
            </div>
            <p style="font-size: 13px; margin-bottom: 0;">If you did not request this email, you can safely ignore it.</p>
            <div class="footer">
                &copy; ${new Date().getFullYear()} CyberShield. All rights reserved.
            </div>
        </div>
    </body>
    </html>`;
}