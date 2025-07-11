const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendVerificationEmail = async (to, token) => {
  const url = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  return transporter.sendMail({
    from: '"MERN Auth" <no-reply@mernauth.com>',
    to,
    subject: "Verify your email",
    html: `<h2>Welcome!</h2><p>Click to verify: <a href="${url}">${url}</a></p>`,
  });
};
