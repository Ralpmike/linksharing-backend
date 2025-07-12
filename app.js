const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const errorHandler = require("./middlewares/error.middleware");

const app = express();

//?middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

//?routes
// app.get("/", (req, res) => res.send("Hello World!"));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);

app.use(errorHandler);

module.exports = app;
