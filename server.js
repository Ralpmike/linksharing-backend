const doenv = require("dotenv");
const connectDB = require("./config/db");

doenv.config();

const app = require("./app");

const PORT = process.env.PORT || 5000;

connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
