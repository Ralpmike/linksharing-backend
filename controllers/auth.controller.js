const User = require("../models/user.model");
const { signToken } = require("../utils/jwt");

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "Email already exists" });

    const user = await User.create({ name, email, password });
    const token = signToken({ id: user._id, role: user.role });
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(400).json({ message: "Invalid credentials" });

    const token = signToken({ id: user._id, role: user.role });
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
};
