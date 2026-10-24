const { error } = require('../utils/response');

/**
 * Higher-order middleware to validate req.body against a Joi schema
 * @param {Object} schema - Joi schema object
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error: validationError, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (validationError) {
      const details = validationError.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return error(res, 'Validation error', 400, details);
    }

    req.body = value;
    next();
  };
};

module.exports = validate;
