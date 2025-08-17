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
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

//? Register User

exports.register = catchAsync(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) return next(new AppError("Email already registered", 400));
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
});

//? Verify Email
exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { token } = req.query;
  const decoded = verifyEmailToken(token);

  const user = await User.findById(decoded.id);
  if (!user) return next(new AppError("User not found", 404));
  if (user.verified) return next(new AppError("Email already verified", 400));

  user.verified = true;
  await user.save();

  res.json({ message: "Email verified successfully. You can now log in." });
});

//? login User

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError("Invalid credentials", 400));
  }

  if (!user.verified) {
    return next(new AppError("Email not verified", 403));
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
    maxAge: process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000, // 7 days
  });

  res.json({
    success: true,
    message: "Login successful",
    accessToken,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
});

//?refresh token

exports.refreshToken = catchAsync(async (req, res, next) => {
  console.log("Incoming refresh token:", req.cookies.refreshToken);
  const token = req.cookies.refreshToken;

  if (!token) {
    next(new AppError("unauthorized: Refresh token missing", 401));
  }

  const decoded = verifyToken(token);

  // 🔐 Compare Redis-stored token
  const redisToken = await redisClient.get(decoded.id);

  if (!redisToken || redisToken !== token) {
    return next(new AppError("unauthorized: Refresh token mismatch", 401));
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
});

//? logout user
exports.logout = catchAsync(async (req, res, next) => {
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
});

//? forgot password
const generateResetToken = () => crypto.randomBytes(32).toString("hex");

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  //? Check if user exists
  const user = await User.findOne({ email });
  if (!user) {
    next(new AppError("Email not found", 404));
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
});

//? reset password
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  const userId = await redisClient.get(`reset:${token}`);

  if (!userId) {
    return next(
      new AppError("Password reset token is invalid or expired", 400)
    );
  }

  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  user.password = password;
  await user.save();

  await redisClient.del(`reset:${token}`);

  res.status(200).json({ success: true, message: "Password reset successful" });
});
