import * as model from '../models/product.js';

export const getProducts = (req, res, next) => {
  try {
    const data = model.findAll(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getProduct = (req, res, next) => {
  try {
    const data = model.findById(req.params.id);
    if (!data) {
      const err = new Error('Product not found');
      err.status = 404;
      return next(err);
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createProduct = (req, res, next) => {
  try {
    const data = model.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = (req, res, next) => {
  try {
    const data = model.update(req.params.id, req.body);
    if (!data) {
      const err = new Error('Product not found');
      err.status = 404;
      return next(err);
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = (req, res, next) => {
  try {
    const data = model.deleteById(req.params.id);
    if (!data) {
      const err = new Error('Product not found');
      err.status = 404;
      return next(err);
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
