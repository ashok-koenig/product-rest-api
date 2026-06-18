import * as model from '../models/product.js';
import catchAsync from '../middleware/catchAsync.js';

export const getProducts = catchAsync((req, res) => {
  const data = model.findAll(req.query);
  res.json({ success: true, data });
});

export const getProduct = catchAsync((req, res, next) => {
  const data = model.findById(req.params.id);
  if (!data) {
    const err = new Error('Product not found');
    err.status = 404;
    return next(err);
  }
  res.json({ success: true, data });
});

export const createProduct = catchAsync((req, res) => {
  const data = model.create(req.body);
  res.status(201).json({ success: true, data });
});

export const updateProduct = catchAsync((req, res, next) => {
  const data = model.update(req.params.id, req.body);
  if (!data) {
    const err = new Error('Product not found');
    err.status = 404;
    return next(err);
  }
  res.json({ success: true, data });
});

export const deleteProduct = catchAsync((req, res, next) => {
  const data = model.archiveById(req.params.id);
  if (!data) {
    const err = new Error('Product not found');
    err.status = 404;
    return next(err);
  }
  res.status(204).send();
});

export const restoreProduct = catchAsync((req, res, next) => {
  const data = model.restore(req.params.id);
  if (!data) {
    const err = new Error('Product not found');
    err.status = 404;
    return next(err);
  }
  res.json({ success: true, data });
});
