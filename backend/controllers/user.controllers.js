const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { hashPassword, verifyPassword } = require("../utils/hashPassword");
const crypto = require("crypto");
const UserOTPVerification = require("../models/userotp.model");
const { NotificationService } = require("../utils/NotificationService");
const nodemailer = require("nodemailer");
const asyncHandler = require("../utils/asyncHandler");
const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS,
    },
});
const signIn = asyncHandler(async (req, res, next) => {
    let { username, password, deviceToken } = req.body;
    username = username.trim().toLowerCase();

    // Detect device type from request
    const deviceType = req.headers["user-agent"].includes("Mobile")
        ? "mobile"
        : "desktop";

    const user = await User.findOne({ username });

    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        return next(error);
    }

    if (user.isVerified === false) {
        const error = new Error("User not verified");
        await User.deleteMany({ username });
        error.statusCode = 400;
        return next(error);
    }

    const isMatch = await verifyPassword(password, user.password);

    if (!isMatch) {
        const error = new Error("Invalid username or password");
        error.statusCode = 401;
        return next(error);
    }

    // Manage device tokens
    const deviceIndex = deviceType === "desktop" ? 0 : 1;

    // Update token for specific device type
    if (user.deviceTokens[deviceIndex] != deviceToken) {
        user.deviceTokens[deviceIndex] = deviceToken;
        await user.save();
    }

    const token = jwt.sign(
        {
            username: username,
            email: user.email,
            role: user.role,
        },
        process.env.JWT_SECRET
    );

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000,
    });

    await NotificationService.sendNotification(
        deviceToken,
        "Login Successful",
        `Logged in at: ${new Date().toLocaleString()}`
    );

    return res.status(200).json({
        success: true,
        message: "Login success!",
        token: token,
        user: {
            username: user.username,
            email: user.email,
            role: user.role,
            fullName: user.fullName,
        },
    });
});
const signUp = asyncHandler(async (req, res, next) => {
    let { username, password, fullName, email, mobileNo } = req.body;
    username = username.trim().toLowerCase();
    email = email.trim().toLowerCase();
    mobileNo = mobileNo.trim().toLowerCase();
    fullName = fullName.trim().toLowerCase();
    const existingVerifiedUser = await User.findOne({
        $or: [{ username }, { email }, { mobileNo }],
        isVerified: true,
    });

    if (existingVerifiedUser) {
        const error = new Error("duplicate user found");
        error.statusCode = 400;
        error.key =
            existingVerifiedUser.username === username
                ? "username"
                : existingVerifiedUser.email === email
                ? "email"
                : "mobileNo";
        return next(error);
    }

    await User.deleteMany({
        $or: [{ username }, { email }, { mobileNo }],
        isVerified: false,
    });

    const privateKey = crypto
        .randomBytes(32)
        .toString("base64")
        .replace(/[+/]/g, (m) => (m === "+" ? "-" : "_"));

    const hash = await hashPassword(password);
    const newUser = await User.create({
        username,
        password: hash,
        fullName,
        email,
        mobileNo,
        privateKey,
    });

    await newUser.save();
    await sendOTPVerificationEmail({ username, email }, res);
});
const signOut = asyncHandler(async (req, res, next) => {
    res.clearCookie("token");
    console.log("cookie removed");
    return res.status(200).json({ message: "Logged out successfully" });
});

const checkAuthStatus = asyncHandler(async (req, res, next) => {
    return res.status(200).json({
        status: true,
        user: {
            username: req.user.username,
            email: req.user.email,
            role: req.user.role,
            fullName: req.user.fullName,
            mobileNo: req.user.mobileNo,
        },
    });
});

const sendOTPVerificationEmail = asyncHandler(
    async ({ username, email }, res) => {
        const otp = `${Math.floor(1000 + Math.random() * 9000)}`;
        const mailOptions = {
            from: process.env.AUTH_EMAIL,
            to: email,
            subject: "Verify your email",
            html: `<p>Enter the OTP : <b>${otp}</b> on verification page to complete your registration</p><p>The OTP will expire in 10 minutes</p>`,
        };

        //generate hashed otp
        const saltRounds = 10;
        // const hashedOtp = await bcrypt.hash(otp, saltRounds);
        const hashedOtp = await hashPassword(otp);
        const newOTPVerification = await new UserOTPVerification({
            username,
            otp: hashedOtp,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 600000),
        });
        await newOTPVerification.save();
        await transporter.sendMail(mailOptions);
        return res.status(200).json({
            status: "pending",
            message: "OTP sent successfully",
            data: {
                username,
                email,
            },
        });
    }
);

const verifyOTP = asyncHandler(async (req, res) => {
    let { username, otp } = req.body;
    username = username.trim().toLowerCase();
    otp = otp.trim().toLowerCase();
    if (!username || !otp)
        return res.status(400).json({ message: "OTP is required" });
    else {
        const userOTPVerificationReacords = await UserOTPVerification.find({
            username,
        });
        if (userOTPVerificationReacords.length <= 0)
            return res.status(404).json({ message: "OTP not found" });
        else {
            const { expiresAt } = userOTPVerificationReacords[0];
            const hashedOtp =
                userOTPVerificationReacords[
                    userOTPVerificationReacords.length - 1
                ].otp;

            if (expiresAt < Date.now()) {
                await UserOTPVerification.deleteMany({ username });
                return res.status(400).json({ message: "OTP expired" });
            } else {
                // const isValid = await bcrypt.compare(otp, hashedOtp);
                const isValid = await verifyPassword(otp, hashedOtp);
                console.log(otp);
                if (!isValid)
                    return res.status(400).json({ message: "OTP invalid" });
                else {
                    await User.updateOne({ username }, { isVerified: true });
                    await UserOTPVerification.deleteMany({ username });
                    return res.status(200).json({
                        status: "VERIFIED",
                        message: "OTP verified",
                    });
                }
            }
        }
    }
});

const verifySpOTP = asyncHandler(async (req, res) => {
    let { otp, email } = req.body;
    email = email.trim().toLowerCase();
    otp = otp.trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({
            status: false,
            message: "User not found",
        });
    }
    const username = user.username;
    const userOTPVerificationReacords = await UserOTPVerification.find({
        username,
    });
    if (userOTPVerificationReacords.length <= 0)
        return res.status(404).json({ message: "OTP not found" });
    else {
        const { expiresAt } = userOTPVerificationReacords[0];
        const hashedOtp =
            userOTPVerificationReacords[userOTPVerificationReacords.length - 1]
                .otp;

        if (expiresAt < Date.now()) {
            await UserOTPVerification.deleteMany({ username });
            return res.status(400).json({ message: "OTP expired" });
        } else {
            console.log(otp);
            // const isValid = await bcrypt.compare(otp, hashedOtp);
            const isValid = await verifyPassword(otp, hashedOtp);
            if (!isValid)
                return res.status(400).json({ message: "OTP invalid" });
            else {
                await User.updateOne({ username }, { isVerified: true });
                await UserOTPVerification.deleteMany({ username });
                const sptoken = jwt.sign(
                    { username: user.username, email, usage: "OTP" },
                    process.env.JWT_SECRET
                );
                res.cookie("sptoken", sptoken, {
                    httpOnly: true,
                    sameSite: "strict",
                    maxAge: 10 * 60 * 1000,
                });
                return res.status(200).json({ status: true });
            }
        }
    }
});

const resendOTPAndVerify = asyncHandler(async (req, res) => {
    const { username, email } = req.body;
    if (!username || !email) {
        return res.status(400).json({
            status: "FAILED",
            message: "Please provide username and email.",
        });
    } else {
        await UserOTPVerification.deleteMany({ username });
        sendOTPVerificationEmail({ username, email }, res);
    }
});

const sendPasswordResetOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res
            .status(400)
            .json({ status: "FAILED", message: "Email is required" });
    }
    const otp = `${Math.floor(1000 + Math.random() * 9000)}`;
    const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "OTP for reseting password",
        html: `<p>Enter the OTP : <b>${otp}</b> on verification page for changing your password</p><p>The OTP will expire in 10 minutes</p>`,
    };

    //generate hashed otp
    const saltRounds = 10;
    // const hashedOtp = await bcrypt.hash(otp, saltRounds);
    const hashedOtp = await hashPassword(otp);
    const user = await User.findOne({ email });
    const newOTPVerification = await new UserOTPVerification({
        username: user.username,
        otp: hashedOtp,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 600000),
    });
    await newOTPVerification.save();
    await transporter.sendMail(mailOptions);
    return res.status(200).json({
        status: "pending",
        message: "OTP sent successfully",
        data: {
            username: user.username,
            email,
        },
    });
});
const resetPassword = asyncHandler(async (req, res) => {
    let username;
    const { newPassword } = req.body;

    // if (req.usage === "OTP") {
    //     username = req.username;
    // } else {
    //     username = req.body.username;
    // }
    username = req.user.username;
    if (!newPassword || !username) {
        return res.status(400).json({
            status: "FAILED",
            message: `Please provide ${username ? "new password" : "username"}`,
        });
    }
    // const hash = await bcrypt.hash(newPassword, 10);
    const hash = await hashPassword(newPassword);
    await User.updateOne({ username }, { password: hash });
    return res.status(200).json({
        status: "SUCCESS",
        message: "Password updated successfully",
    });
});

const updateProfile = asyncHandler(async (req, res, next) => {
    const { fullName, mobileNo } = req.body;
    if (!fullName || !mobileNo) {
        const error = new Error("Please provide fullName and mobileNo");
        error.statusCode = 400;
        return next(error);
    }
    await User.updateOne(
        { username: req.user.username },
        { fullName, mobileNo }
    );
    return res.status(200).json({
        status: "SUCCESS",
        message: "Profile updated successfully",
    });
});

const toggleUserStatus = asyncHandler(async (req, res, next) => {
    let { username, isActive } = req.body;
    username = username.trim().toLowerCase();
    isActive = isActive.trim().toLowerCase();
    if (!username || !isActive) {
        const error = new Error("username and isActive are required");
        error.statusCode = 400;
        return next(error);
    }
    const user = await User.findOne({ username });
    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        return next(error);
    }
    if (user._id === req.user._id || user.role === Role.ADMIN) {
        const error = new Error("Access Denied!");
        error.statusCode = 400;
        return next(error);
    }
    await User.updateOne(
        { username },
        { isActive: isActive === "true" ? true : false }
    );
    return res.status(200).json({
        status: "SUCCESS",
        message: `${username} is now ${isActive ? "activated" : "deactivated"}`,
    });
});

module.exports = {
    signIn,
    signUp,
    signOut,
    verifyOTP,
    resendOTPAndVerify,
    checkAuthStatus,
    sendPasswordResetOTP,
    resetPassword,
    verifySpOTP,
    updateProfile,
    toggleUserStatus,
};
