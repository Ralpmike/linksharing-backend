const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendVerificationEmail = async (to, token, userName) => {
  const url = `${
    process.env.CLIENT_URL ||
    "https://link-sharing-kappa.vercel.app/verify-email"
  }/api/v1/auth/verify-email?token=${token}`;
  return transporter.sendMail({
    from: '"LinkSharing App🈸" <no-reply@mernauth.com>',
    to,
    subject: "Verify your email",
    html: `<h2>Welcome ${userName}!</h2><p><em>Click to verify your email</em>: <a href="${url}">${url}</a></p>`,
  });
};

exports.sendResetEmail = async (to, resetUrl) => {
  return transporter.sendMail({
    from: '"LinkSharing App🈸" <no-reply@mernauth.com>',
    to,
    subject: "Reset your password",
    html: `<h2>Reset your password</h2><p><em>Click to reset your password</em>: <a href="${resetUrl}">${resetUrl}</a></p>`,
  });
};

exports.sendOTPEmail = async (to, otp) => {
  return transporter.sendMail({
    from: '"MERN Auth" <no-reply@mernauth.com>',
    to,
    subject: "Your OTP for 2FA Login",
    html: `<h3>Login Code</h3><p>Your 2FA code is <strong>${otp}</strong>. It will expire in 5 minutes.</p>`,
  });
};
