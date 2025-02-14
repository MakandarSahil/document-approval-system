const express = require("express");
const router = express.Router();
const {
    registerDetailsValidator,
    ensureUniqueUser,
    ensureEmailExists,
    loginDetailsValidator,
    verifySession,
    authorizeRoles,
    emailValidator,
} = require("../middlewares/auth.middlewares");
const { register, login, logout } = require("../controllers/auth.controllers");
const { sendOTPEmail } = require("../controllers/otp.controllers");
const { Role } = require("../utils/enums");

router.post(
    "/register",
    verifySession,
    authorizeRoles([Role.ADMIN]),
    registerDetailsValidator,
    ensureUniqueUser,
    register
);

router.post("/login", loginDetailsValidator, login);
router.post("/logout", verifySession, logout);

router.post("/send-otp", emailValidator, ensureEmailExists, sendOTPEmail);

module.exports = router;
