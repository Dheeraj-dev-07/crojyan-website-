const sendSuccess = (res, statusCode = 200, data = null, meta = null, message = 'Success') => {
  const responseEnvelope = {
    success: true,
    message,
    data
  };

  if (meta) {
    responseEnvelope.meta = meta;
  }

  return res.status(statusCode).json(responseEnvelope);
};

const sendError = (res, statusCode = 500, errorCode = 'ERR_INTERNAL_SERVER', message = 'Internal Server Error', details = null) => {
  const errorEnvelope = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details && { details })
    }
  };

  return res.status(statusCode).json(errorEnvelope);
};

module.exports = {
  sendSuccess,
  sendError
};
