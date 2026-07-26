const Joi = require('joi');

exports.createTransactionValidator = Joi.object({
  type: Joi.string().valid('deposit', 'withdraw').required(),
  amount: Joi.number().min(1).required(),
  refCode: Joi.string().allow('', null),
  shabaNumber: Joi.string().allow('', null),
  description: Joi.string().allow('', null)
});

exports.updateTransactionAdminValidator = Joi.object({
  status: Joi.string().valid('pending', 'approved', 'rejected').required(),
  description: Joi.string().allow('', null),
  refCode: Joi.string().allow('', null)
});

