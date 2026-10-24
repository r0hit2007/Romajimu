const Joi = require('joi');

const signupSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.empty': 'Name is required',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'A valid email address is required',
    'string.empty': 'Email is required',
  }),
  password: Joi.string().min(6).max(128).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'string.empty': 'Password is required',
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'A valid email address is required',
    'string.empty': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
  }),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'A valid email address is required',
    'string.empty': 'Email is required',
  }),
  newPassword: Joi.string().min(6).max(128).required().messages({
    'string.min': 'New password must be at least 6 characters long',
    'string.empty': 'New password is required',
  }),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'string.empty': 'Refresh token is required',
  }),
});

const contactSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  phone: Joi.string().min(5).max(30).required(),
  relationship: Joi.string().max(50).default('Other').allow('', null),
  is_sos_enabled: Joi.boolean().default(true),
});

const settingsSchema = Joi.object({
  countdown: Joi.number().integer().min(0).max(60).optional(),
  practice_mode: Joi.boolean().optional(),
  custom_message: Joi.string().max(500).allow('', null).optional(),
  region: Joi.string().max(10).optional(),
  include_location: Joi.boolean().optional(),
  include_audio: Joi.boolean().optional(),
});

const sosHistorySchema = Joi.object({
  latitude: Joi.number().allow(null).optional(),
  longitude: Joi.number().allow(null).optional(),
  message: Joi.string().required(),
  trigger_method: Joi.string().valid('shake', 'calculator', 'manual').default('manual'),
  status: Joi.string().valid('sent', 'cancelled', 'practice', 'failed').default('sent'),
  recipient_count: Joi.number().integer().min(0).default(0),
});

module.exports = {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  refreshTokenSchema,
  contactSchema,
  settingsSchema,
  sosHistorySchema,
};
