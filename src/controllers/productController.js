import * as model from '../models/product.js';
import catchAsync from '../middleware/catchAsync.js';

/**
 * Returns all active (non-archived) products, optionally filtered by query parameters.
 *
 * Query parameters are forwarded directly to `model.findAll`; unknown keys are
 * silently ignored. An empty result set is a success — the response body will
 * contain an empty `data` array rather than a 404.
 *
 * @param {import("express").Request}      req  - Express request; recognises `req.query` fields:
 *   `category`, `status`, `minPrice`, `maxPrice`, `inStock`, `name`, `search`.
 * @param {import("express").Response}     res  - Express response.
 * @param {import("express").NextFunction} next - Express next middleware (unused; present via catchAsync).
 * @returns {void}
 *
 * @response 200 `{ success: true, data: Product[] }` — always returned (array may be empty).
 */
export const getProducts = catchAsync((req, res) => {
  const data = model.findAll(req.query);
  res.json({ success: true, data });
});

/**
 * Returns a single active product by its UUID.
 *
 * Archived products are treated as absent and produce a 404, matching the
 * behaviour a client would observe before the product was ever created.
 *
 * @param {import("express").Request}      req       - Express request; expects `req.params.id` (UUID).
 * @param {import("express").Response}     res       - Express response.
 * @param {import("express").NextFunction} next      - Express next; called with a 404 error when the product is not found.
 * @returns {void}
 *
 * @response 200 `{ success: true, data: Product }` — product found.
 * @response 404 Product not found or archived.
 */
export const getProduct = catchAsync((req, res, next) => {
  const data = model.findById(req.params.id);
  if (!data) {
    const err = new Error('Product not found');
    err.status = 404;
    return next(err);
  }
  res.json({ success: true, data });
});

/**
 * Creates a new product from the request body and returns the saved record.
 *
 * Validation and SKU-uniqueness checks are performed inside the model.
 * `catchAsync` forwards any thrown error to the Express error handler, so
 * validation failures (400) and duplicate-SKU conflicts (409) surface as
 * structured error responses without additional try/catch here.
 *
 * @param {import("express").Request}      req  - Express request; expects a JSON body with at minimum `name` and `sku`.
 * @param {import("express").Response}     res  - Express response.
 * @param {import("express").NextFunction} next - Express next middleware (unused directly; catchAsync routes errors through it).
 * @returns {void}
 *
 * @response 201 `{ success: true, data: Product }` — product created.
 * @response 400 Missing required fields (`name`, `sku`) or a field fails validation.
 * @response 409 A product with the given SKU already exists (including archived products).
 */
export const createProduct = catchAsync((req, res) => {
  const data = model.create(req.body);
  res.status(201).json({ success: true, data });
});

/**
 * Applies a partial update to an existing active product.
 *
 * Only mutable fields (`name`, `description`, `category`, `price`, `stock`,
 * `status`) are accepted; `id`, `sku`, and `createdAt` are immutable and
 * silently ignored if present in the body. Archived products return 404 —
 * restore the product first.
 *
 * @param {import("express").Request}      req  - Express request; expects `req.params.id` (UUID) and a JSON patch body.
 * @param {import("express").Response}     res  - Express response.
 * @param {import("express").NextFunction} next - Express next; called with a 404 error when the product is not found or archived.
 * @returns {void}
 *
 * @response 200 `{ success: true, data: Product }` — product updated.
 * @response 400 A supplied field fails validation.
 * @response 404 Product not found or archived.
 */
export const updateProduct = catchAsync((req, res, next) => {
  const data = model.update(req.params.id, req.body);
  if (!data) {
    const err = new Error('Product not found');
    err.status = 404;
    return next(err);
  }
  res.json({ success: true, data });
});

/**
 * Soft-archives a product — it is hidden from list/get endpoints but is NOT
 * deleted, and its SKU remains permanently reserved.
 *
 * The 204 response intentionally has no body. To undo the archive, call the
 * restore endpoint. Calling this on an already-archived product returns 404.
 *
 * @param {import("express").Request}      req  - Express request; expects `req.params.id` (UUID).
 * @param {import("express").Response}     res  - Express response.
 * @param {import("express").NextFunction} next - Express next; called with a 404 error when the product is not found or already archived.
 * @returns {void}
 *
 * @response 204 Product successfully archived; no response body.
 * @response 404 Product not found or already archived.
 */
export const deleteProduct = catchAsync((req, res, next) => {
  const data = model.archiveById(req.params.id);
  if (!data) {
    const err = new Error('Product not found');
    err.status = 404;
    return next(err);
  }
  res.status(204).send();
});

/**
 * Restores a previously archived product, making it visible in list/get endpoints again.
 *
 * Calling this on an active (non-archived) product or on an unknown id returns
 * 404 — there is nothing to restore.
 *
 * @param {import("express").Request}      req  - Express request; expects `req.params.id` (UUID of an archived product).
 * @param {import("express").Response}     res  - Express response.
 * @param {import("express").NextFunction} next - Express next; called with a 404 error when no archived product matches the id.
 * @returns {void}
 *
 * @response 200 `{ success: true, data: Product }` — product restored and returned.
 * @response 404 Product not found or not currently archived.
 */
export const restoreProduct = catchAsync((req, res, next) => {
  const data = model.restore(req.params.id);
  if (!data) {
    const err = new Error('Product not found');
    err.status = 404;
    return next(err);
  }
  res.json({ success: true, data });
});
