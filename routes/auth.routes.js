const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

router.route("/register").post(authController.register);
router.route("/verify-email").get(authController.verifyEmail);
router.route("/login").post(authController.login);
router.route("/refresh-token").get(authController.refreshToken);
router.route("/logout").get(authController.logout);
router.route("/forgot-password").post(authController.forgotPassword);

router.route("/reset-password/:token").put(authController.resetPassword);

module.exports = router;
