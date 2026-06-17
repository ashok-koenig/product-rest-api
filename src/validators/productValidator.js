import { body, query, validationResult } from 'express-validator';
import { CATEGORIES, STATUSES } from '../models/product.js';

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(Object.assign(new Error(errors.array()[0].msg), { status: 400 }));
  next();
};

const categoryRule = (src) => src.optional().isIn(CATEGORIES).withMessage(`category must be one of: ${CATEGORIES.join(', ')}`);
const statusRule = (src) => src.optional().isIn(STATUSES).withMessage(`status must be one of: ${STATUSES.join(', ')}`);
const priceRule = (src) =>
  src.optional().isFloat({ gt: 0 }).withMessage('price must be a positive number')
    .custom(v => {
      if (Math.round(Number(v) * 100) / 100 !== Number(v)) throw new Error('price must have at most 2 decimal places');
      return true;
    });
const stockRule = (src) => src.optional().isInt({ min: 0 }).withMessage('stock must be a non-negative integer');

export const validateCreate = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('sku').trim().notEmpty().withMessage('sku is required'),
  categoryRule(body('category')),
  statusRule(body('status')),
  priceRule(body('price')),
  stockRule(body('stock')),
  handleValidationErrors,
];

export const validateUpdate = [
  categoryRule(body('category')),
  statusRule(body('status')),
  priceRule(body('price')),
  stockRule(body('stock')),
  handleValidationErrors,
];

export const validateFilters = [
  categoryRule(query('category')),
  statusRule(query('status')),
  query('minPrice').optional().isFloat().withMessage('minPrice must be a number').toFloat(),
  query('maxPrice').optional().isFloat().withMessage('maxPrice must be a number').toFloat(),
  query('inStock').optional().isIn(['true', 'false']).withMessage('inStock must be true or false').toBoolean(),
  handleValidationErrors,
];
