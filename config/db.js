const mongoose = require("mongoose");

const connectDB = async () => {
  const DB = process.env.MONGODB_URI.replace(
    "<db_password>",
    process.env.MONGODB_PASSWORD
  );
  try {
    mongoose.set("strictQuery", false);
    const connect = await mongoose.connect(DB);
    console.log("MongoDB Connected", connect.connection.host);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
