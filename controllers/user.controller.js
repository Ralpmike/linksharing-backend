const User = require("../models/user.model");

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json({ sucess: true, data: { users } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
