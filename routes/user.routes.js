const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// router.route("/me").get(userController.getMe);
router.route("/").get(authMiddleware.protect, userController.getAllUsers);

module.exports = router;
