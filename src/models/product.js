import { v4 as uuidv4 } from 'uuid';

export const CATEGORIES = ['electronics', 'clothing', 'food', 'books', 'other'];
export const STATUSES = ['active', 'inactive', 'discontinued'];

// Primary index: id → product
const byId = new Map();
// Secondary index: sku → product (includes archived — prevents SKU reuse)
const bySku = new Map();

const badRequest = (message) => {
  const err = new Error(message);
  err.status = 400;
  return err;
};

const validate = (data, isCreate) => {
  if (isCreate) {
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      throw badRequest('name is required');
    }
    if (!data.sku || typeof data.sku !== 'string' || !data.sku.trim()) {
      throw badRequest('sku is required');
    }
  }

  if (data.category !== undefined && !CATEGORIES.includes(data.category)) {
    throw badRequest(`category must be one of: ${CATEGORIES.join(', ')}`);
  }

  if (data.status !== undefined && !STATUSES.includes(data.status)) {
    throw badRequest(`status must be one of: ${STATUSES.join(', ')}`);
  }

  if (data.price !== undefined) {
    const price = Number(data.price);
    if (isNaN(price) || price <= 0) throw badRequest('price must be a positive number');
    if (Math.round(price * 100) / 100 !== price) throw badRequest('price must have at most 2 decimal places');
  }

  if (data.stock !== undefined) {
    const stock = Number(data.stock);
    if (!Number.isInteger(stock) || stock < 0) throw badRequest('stock must be a non-negative integer');
  }
};

/**
 * Returns all non-archived products that match the given filters.
 *
 * Archived products (those with a non-null `archivedAt`) are always excluded —
 * use `restore` to make them visible again. Filter conditions are evaluated
 * cheapest-first (numeric comparisons before string searches) so a mismatch
 * skips the remaining checks for that product as early as possible.
 *
 * @param {object} [filters={}] - Optional filter criteria; omit to return all active products.
 * @param {string} [filters.category] - Exact category match (must be one of {@link CATEGORIES}).
 * @param {string} [filters.status] - Exact status match (must be one of {@link STATUSES}).
 * @param {number} [filters.minPrice] - Inclusive lower bound on price; products with `null` price are excluded.
 * @param {number} [filters.maxPrice] - Inclusive upper bound on price; products with `null` price are excluded.
 * @param {boolean} [filters.inStock] - `true` returns only products with `stock > 0`; `false` returns only `stock === 0`.
 * @param {string} [filters.name] - Case-insensitive substring match against `product.name`.
 * @param {string} [filters.search] - Case-insensitive substring match against both `name` and `description`.
 * @returns {object[]} Array of matching product objects (may be empty).
 */
// Single-pass filter: conditions ordered cheapest-first so a continue skips
// all remaining checks for that product (price/stock comparisons before string
// .includes(), archived guard before everything else).
export const findAll = (filters = {}) => {
  const { category, status, minPrice, maxPrice, inStock, search, name: nameFilter } = filters;
  const searchQ = search ? search.toLowerCase() : null;
  const nameQ = nameFilter ? nameFilter.toLowerCase() : null;

  const result = [];
  for (const p of byId.values()) {
    if (p.archivedAt) continue;
    if (category && p.category !== category) continue;
    if (status && p.status !== status) continue;
    if (minPrice !== undefined && (p.price === null || p.price < minPrice)) continue;
    if (maxPrice !== undefined && (p.price === null || p.price > maxPrice)) continue;
    if (inStock !== undefined && (inStock ? p.stock <= 0 : p.stock !== 0)) continue;
    if (nameQ && !p.name.toLowerCase().includes(nameQ)) continue;
    if (searchQ && !p.name.toLowerCase().includes(searchQ) && !p.description.toLowerCase().includes(searchQ)) continue;
    result.push(p);
  }
  return result;
};

/**
 * Looks up a single active (non-archived) product by its UUID.
 *
 * @param {string} id - The UUID of the product to retrieve.
 * @returns {object|null} The product object, or `null` if no active product with that id exists.
 */
// O(1) — single Map lookup
export const findById = (id) => {
  const p = byId.get(id);
  return p && !p.archivedAt ? p : null;
};

/**
 * Looks up a product by its SKU, including archived products.
 *
 * The secondary index intentionally retains archived entries so that a
 * previously used SKU can never be reassigned to a new product, preserving
 * historical order integrity.
 *
 * @param {string} sku - The SKU string to look up (case-sensitive, exact match).
 * @returns {object|null} The product object (active or archived), or `null` if the SKU is unknown.
 */
// O(1) — secondary index; returns archived products too (guards SKU uniqueness)
export const findBySku = (sku) => bySku.get(sku) ?? null;

const syncMaps = (product) => {
  byId.set(product.id, product);
  bySku.set(product.sku, product);
};

/**
 * Creates a new product and registers it in both in-memory indexes.
 *
 * SKU uniqueness is enforced across the full lifetime of the store — even
 * archived products hold their SKU permanently, so a rejected-409 SKU cannot
 * be recycled by a subsequent create call.
 *
 * @param {object} data - Raw product fields from the caller.
 * @param {string} data.name - Human-readable product name (required, non-empty after trim).
 * @param {string} data.sku - Stock-keeping unit identifier (required, non-empty after trim).
 * @param {string} [data.description=''] - Optional free-text product description.
 * @param {string} [data.category] - Product category; must be one of {@link CATEGORIES} if provided.
 * @param {number} [data.price] - Unit price; must be a positive number with at most 2 decimal places.
 * @param {number} [data.stock=0] - Inventory count; must be a non-negative integer.
 * @param {string} [data.status='active'] - Lifecycle status; must be one of {@link STATUSES} if provided.
 * @returns {object} The newly created product object (includes generated `id` and `createdAt`).
 * @throws {Error} 400 – if `name` or `sku` are missing/empty, or any supplied field fails validation.
 * @throws {Error} 409 – if another product (active or archived) already uses the given SKU.
 */
export const create = (data) => {
  validate(data, true);

  if (bySku.has(data.sku.trim())) {
    const err = new Error('A product with this SKU already exists');
    err.status = 409;
    throw err;
  }

  const product = {
    id: uuidv4(),
    name: data.name.trim(),
    sku: data.sku.trim(),
    description: data.description ?? '',
    category: data.category ?? null,
    price: data.price !== undefined ? Number(data.price) : null,
    stock: data.stock !== undefined ? Number(data.stock) : 0,
    status: data.status ?? 'active',
    createdAt: new Date(),
    archivedAt: null,
  };

  syncMaps(product);
  return product;
};

/**
 * Applies a partial update to an existing active product.
 *
 * Only the fields `name`, `description`, `category`, `price`, `stock`, and
 * `status` may be changed — `id`, `sku`, and `createdAt` are immutable after
 * creation and are silently ignored even if present in `patch`.
 * Archived products cannot be updated; restore them first.
 *
 * @param {string} id - UUID of the product to update.
 * @param {object} patch - Partial product fields to apply; unrecognised or immutable keys are ignored.
 * @param {string} [patch.name] - New display name (non-empty string).
 * @param {string} [patch.description] - New description text.
 * @param {string} [patch.category] - New category; must be one of {@link CATEGORIES}.
 * @param {number} [patch.price] - New price; must be positive with at most 2 decimal places.
 * @param {number} [patch.stock] - New stock level; must be a non-negative integer.
 * @param {string} [patch.status] - New status; must be one of {@link STATUSES}.
 * @returns {object|null} The updated product object, or `null` if no active product with that id exists.
 * @throws {Error} 400 – if any supplied field fails validation.
 */
export const update = (id, patch) => {
  const existing = byId.get(id);
  if (!existing || existing.archivedAt) return null;

  // Whitelist mutable fields — id, sku, and createdAt are immutable after creation
  const { name, description, category, price, stock, status } = patch;
  const allowed = Object.fromEntries(
    Object.entries({ name, description, category, price, stock, status })
      .filter(([, v]) => v !== undefined)
  );

  validate(allowed, false);

  if (allowed.price !== undefined) allowed.price = Number(allowed.price);
  if (allowed.stock !== undefined) allowed.stock = Number(allowed.stock);

  const updated = { ...existing, ...allowed };
  syncMaps(updated);
  return updated;
};

/**
 * Soft-archives a product by stamping its `archivedAt` timestamp.
 *
 * Archived products are hidden from `findAll` and `findById` but remain in the
 * SKU index, preventing any future product from reusing the same SKU. The
 * product can be made active again via `restore`. Calling this on an already-
 * archived product is a no-op that returns `null`.
 *
 * @param {string} id - UUID of the product to archive.
 * @returns {object|null} The archived product object (with `archivedAt` set), or `null` if no active product with that id exists.
 */
export const archiveById = (id) => {
  const existing = byId.get(id);
  if (!existing || existing.archivedAt) return null;
  const archived = { ...existing, archivedAt: new Date() };
  syncMaps(archived);
  return archived;
};

/**
 * Restores a previously archived product by clearing its `archivedAt` field.
 *
 * After restoration the product is visible again in `findAll` and `findById`.
 * Calling this on a product that is not archived (including one that never
 * existed) is a no-op that returns `null`.
 *
 * @param {string} id - UUID of the archived product to restore.
 * @returns {object|null} The restored product object (with `archivedAt` set to `null`), or `null` if no archived product with that id exists.
 */
export const restore = (id) => {
  const existing = byId.get(id);
  if (!existing || !existing.archivedAt) return null;
  const restored = { ...existing, archivedAt: null };
  syncMaps(restored);
  return restored;
};

/**
 * Wipes both in-memory indexes, returning the store to an empty state.
 *
 * Intended exclusively for use in tests — calling this in production will
 * permanently destroy all product data for the lifetime of the process.
 *
 * @returns {void}
 */
// Test-only utility — clears both in-memory indexes so each test starts clean.
export const _reset = () => { byId.clear(); bySku.clear(); };


// End of product model