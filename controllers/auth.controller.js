// const User = require("../models/user.model");
// const { signToken } = require("../utils/jwt");

// exports.register = async (req, res, next) => {
//   try {
//     const { name, email, password } = req.body;
//     const userExists = await User.findOne({ email });
//     if (userExists)
//       return res.status(400).json({ message: "Email already exists" });

//     const user = await User.create({ name, email, password });
//     const token = signToken({ id: user._id, role: user.role });
//     res.status(201).json({ user, token });
//   } catch (err) {
//     next(err);
//   }
// };

const User = require("../models/user.model");
const {
  generateEmailToken,
  verifyEmailToken,
} = require("../services/token.service");
const { signAccessToken, signRefreshToken } = require("../utils/jwt");

const { sendVerificationEmail } = require("../services/mail.service");

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "Email already registered" });

    const newUser = await User.create({ name, email, password });

    const token = generateEmailToken({ id: newUser._id });
    await sendVerificationEmail(email, token);

    res.status(201).json({
      message:
        "Registration successful. Please check your email to verify your account.",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: {
        error: err.message,
        stack: err.stack,
      },
    });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const decoded = verifyEmailToken(token);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.verified)
      return res.status(400).json({ message: "Email already verified" });

    user.verified = true;
    await user.save();

    res.json({ message: "Email verified successfully. You can now log in." });
  } catch (err) {
    res.status(400).json({ message: "Invalid or expired token" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid credentials",
          error: "Invalid password",
        },
      });
    }

    if (!user.verified) {
      return res.status(403).json({ message: "Email not verified" });
    }

    const payload = { id: user._id, role: user.role };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Send refresh token in HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      message: "Login successful",
      data: {
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: {
        error: err.message,
        stack: err.stack,
      },
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json({ sucess: true, data: { users } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
