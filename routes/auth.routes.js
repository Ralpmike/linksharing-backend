const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

router.route("/register").post(authController.register);
router.route("/verify-email").get(authController.verifyEmail);
router.route("/login").post(authController.login);

router.route("/").get(authController.getAllUsers);

module.exports = router;
