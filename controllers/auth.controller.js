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
const {
  signAccessToken,
  signRefreshToken,
  verifyToken,
} = require("../utils/jwt");

const redisClient = require("../utils/redis");
const crypto = require("crypto");

const {
  sendVerificationEmail,
  sendResetEmail,
} = require("../services/mail.service");

//? Register User

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "Email already registered" });

    const newUser = await User.create({ name, email, password, role });

    const token = generateEmailToken({ id: newUser._id, name: newUser.name });
    await sendVerificationEmail(email, token, newUser.name);

    res.status(201).json({
      success: true,
      message:
        "Registration successful. Please check your email to verify your account.",
      data: {
        newUser,
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

//? Verify Email

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

//? login User

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

    // 🔴 Save to Redis: key = user ID, value = refresh token
    await redisClient.set(user._id.toString(), refreshToken);

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

//? refresh token

exports.refreshToken = async (req, res) => {
  try {
    console.log("Incoming refresh token:", req.cookies.refreshToken);
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        error: "Refresh token missing",
      });
    }

    const decoded = verifyToken(token);

    // 🔐 Compare Redis-stored token
    const redisToken = await redisClient.get(decoded.id);

    if (!redisToken || redisToken !== token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        error: "Refresh token mismatch",
      });
    }

    console.log("decoded", decoded);

    const NewAccessToken = signAccessToken({
      id: decoded.id,
      role: decoded.role,
    });

    res.status(201).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken: NewAccessToken,
      },
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
};

//? logout user

exports.logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (token) {
      const decoded = verifyToken(token);
      await redisClient.del(decoded.id);
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Logout failed" });
  }
};

const generateResetToken = () => crypto.randomBytes(32).toString("hex");

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email not found" });
    }
    //? Generate reset token
    const resetToken = generateResetToken();

    //?Store it in Redis(expires in 15 minutes)
    await redisClient.set(`reset:${resetToken}`, user._id.toString(), {
      EX: 60 * 15,
    });

    const resetUrl = `${process.env.CLIENT_URL}/api/v1/auth/reset-password/${resetToken}`;
    await sendResetEmail(email, resetUrl);

    res.status(200).json({
      success: true,
      message: "Password reset link sent to mail",
      resetToken,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const userId = await redisClient.get(`reset:${token}`);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Password reset token is invalid or expired",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = password;
    await user.save();

    await redisClient.del(`reset:${token}`);

    res
      .status(200)
      .json({ success: true, message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};
