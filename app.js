const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const globalErrorHandler = require("./middlewares/error.middleware");

const app = express();

//? Security HTTP headers
app.use(helmet());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
//? Limit requests from same API
const limiter = rateLimit({
  limit: 100,
  windowMs: 60 * 60 * 1000,
  message: {
    error: "Too many requests from this IP, please try again in an hour!",
  },
});

app.use("/api", limiter);

//?middleware
app.use(express.json());

app.use(cors());
app.use(cookieParser());

//?routes
app.get("/", (req, res) => res.send("Hello World!"));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);

// UNHANDLED ROUTES
app.use((req, res, next) => {
  // Pass error into global handler
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// GLOBAL ERROR HANDLER 👇 (last middleware)
app.use(globalErrorHandler);

module.exports = app;
