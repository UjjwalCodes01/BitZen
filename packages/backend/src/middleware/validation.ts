import { body, param, query, ValidationChain } from 'express-validator';

export const agentValidation = {
  register: [
    body('address')
      .isString()
      .matches(/^0x[a-fA-F0-9]{63,64}$/)
      .withMessage('Invalid Starknet address'),
    body('proof_data')
      .isArray()
      .withMessage('Proof data must be an array'),
    body('public_inputs')
      .isArray()
      .withMessage('Public inputs must be an array'),
  ] as ValidationChain[],

  getAgent: [
    param('address')
      .isString()
      .matches(/^0x[a-fA-F0-9]{63,64}$/)
      .withMessage('Invalid Starknet address'),
  ] as ValidationChain[],
};

export const serviceValidation = {
  register: [
    body('name')
      .isString()
      .isLength({ min: 3, max: 100 })
      .withMessage('Service name must be 3-100 characters'),
    body('description')
      .isString()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('endpoint')
      .isURL()
      .withMessage('Invalid endpoint URL'),
    body('stake_amount')
      .isNumeric()
      .custom((value) => value > 0)
      .withMessage('Stake amount must be positive'),
  ] as ValidationChain[],

  submitReview: [
    param('id')
      .isString()
      .withMessage('Service ID required'),
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('review_hash')
      .isString()
      .withMessage('Review hash required'),
  ] as ValidationChain[],

  search: [
    query('category')
      .optional()
      .isString(),
    query('min_stake')
      .optional()
      .isNumeric(),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ] as ValidationChain[],
};

export const auditorValidation = {
  stake: [
    body('service_id')
      .isString()
      .withMessage('Service ID required'),
    body('amount')
      .isNumeric()
      .custom((value) => value > 0)
      .withMessage('Amount must be positive'),
  ] as ValidationChain[],
};
