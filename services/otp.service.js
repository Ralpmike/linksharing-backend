const crypto = require("crypto");

// Generate 6-digit OTP
exports.generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // e.g., "429365"
};

// Generate Redis key (namespaced)
exports.getOTPKey = (userId) => `otp:${userId}`;
