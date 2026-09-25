const AppError = require('../utils/AppError');
const ERROR_CODES = require('../constants/errorCodes');

const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      // If req.body contains JSON string fields (e.g. multipart/form-data), parse them
      if (req.body && typeof req.body === 'object') {
        ['dimensions', 'customization', 'variantDeltas'].forEach((field) => {
          if (typeof req.body[field] === 'string') {
            try {
              req.body[field] = JSON.parse(req.body[field]);
            } catch (e) {
              // ignore parse errors, let Zod catch it
            }
          }
        });
      }

      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error.errors) {
        const formattedDetails = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return next(
          new AppError(
            'Request validation failed',
            400,
            ERROR_CODES.ERR_VALIDATION_FAILED,
            formattedDetails
          )
        );
      }
      next(error);
    }
  };
};

module.exports = validateRequest;
