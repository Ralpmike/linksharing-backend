const jwt = require("jsonwebtoken");

exports.generateEmailToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
};

exports.verifyEmailToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};
