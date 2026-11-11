class AppError extends Error {
  constructor(message, statusCode, code, extra = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Object.assign(this, extra);
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;