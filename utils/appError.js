class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    //? Set error type: "fail" for client errors (4xx), "error" for server errors (5xx)
    this.status = `${this.statusCode}`.startsWith(4) ? "fail" : "error";

    //? Mark Erorr as operational (safe to send to client)

    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
