const DEFAULT_ERROR_CODES = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  500: 'INTERNAL_SERVER_ERROR'
};

const sendSuccess = (res, message, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const sendError = (res, message, statusCode = 500, errorCode) => {
  const code = errorCode || DEFAULT_ERROR_CODES[statusCode] || 'UNKNOWN_ERROR';
  return res.status(statusCode).json({
    success: false,
    message,
    error: code
  });
};

module.exports = {
  sendSuccess,
  sendError
};
