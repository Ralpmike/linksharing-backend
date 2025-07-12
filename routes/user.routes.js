const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");

// router.route("/me").get(userController.getMe);
router.route("/").get(userController.getAllUsers);

module.exports = router;
