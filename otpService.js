const nodemailer = require('nodemailer');

class OTPService {
    constructor() {
        this.otpStorage = new Map();
        this.otpExpirySeconds = 300; // 5 minutes

        // Hardcoded for urgent deployment as requested
        this.senderEmail = "otakuaniverseofficial@gmail.com";
        this.appPassword = "adxpxirxgwnrcjlo";

        this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // Use SSL
            auth: {
                user: this.senderEmail,
                pass: this.appPassword
            }
        });
    }

    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    storeOTP(email, otp) {
        this.otpStorage.set(email.toLowerCase(), {
            otp: otp,
            timestamp: Date.now() / 1000
        });
    }

    verifyOTP(email, otp) {
        const stored = this.otpStorage.get(email.toLowerCase());
        if (!stored) return false;

        const now = Date.now() / 1000;
        if (now - stored.timestamp > this.otpExpirySeconds) {
            this.otpStorage.delete(email.toLowerCase());
            return false;
        }

        if (stored.otp === otp) {
            this.otpStorage.delete(email.toLowerCase());
            return true;
        }
        return false;
    }

    async sendOTPEmail(recipientEmail, otp) {
        const mailOptions = {
            from: `"VIT-ChainVote" <${this.senderEmail}>`,
            to: recipientEmail,
            subject: 'Your OTP Code - VIT-ChainVote',
            text: `Your VIT-ChainVote OTP is: ${otp}\n\nThis code will expire in 5 minutes.`
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`✅ OTP SENT successfully to ${recipientEmail}`);
            return true;
        } catch (error) {
            console.error(`❌ SMTP Error: ${error.message}`);
            return false;
        }
    }

    async generateAndSendOTP(email) {
        const otp = this.generateOTP();
        this.storeOTP(email, otp);

        // Node.js is naturally non-blocking. We don't await this so the API responds instantly.
        this.sendOTPEmail(email, otp).catch(err => console.error("Background OTP send failed:", err));

        return { success: true, message: "OTP verification process initiated" };
    }
}

module.exports = OTPService;
