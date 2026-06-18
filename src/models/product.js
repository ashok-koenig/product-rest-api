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

// O(1) — single Map lookup
export const findById = (id) => {
  const p = byId.get(id);
  return p && !p.archivedAt ? p : null;
};

// O(1) — secondary index; returns archived products too (guards SKU uniqueness)
export const findBySku = (sku) => bySku.get(sku) ?? null;

const syncMaps = (product) => {
  byId.set(product.id, product);
  bySku.set(product.sku, product);
};

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

export const update = (id, patch) => {
  const existing = byId.get(id);
  if (!existing || existing.archivedAt) return null;

  // Whitelist mutable fields — prevents mass assignment of id/createdAt/archivedAt
  const { name, sku, description, category, price, stock, status } = patch;
  const allowed = Object.fromEntries(
    Object.entries({ name, sku, description, category, price, stock, status })
      .filter(([, v]) => v !== undefined)
  );

  validate(allowed, false);

  if (allowed.sku !== undefined) {
    const dup = bySku.get(allowed.sku);
    if (dup && dup.id !== id) {
      const err = new Error('A product with this SKU already exists');
      err.status = 409;
      throw err;
    }
  }

  if (allowed.price !== undefined) allowed.price = Number(allowed.price);
  if (allowed.stock !== undefined) allowed.stock = Number(allowed.stock);

  const updated = { ...existing, ...allowed };

  // If SKU changed, drop the old secondary-index entry
  if (allowed.sku !== undefined && allowed.sku !== existing.sku) {
    bySku.delete(existing.sku);
  }
  syncMaps(updated);
  return updated;
};

export const archiveById = (id) => {
  const existing = byId.get(id);
  if (!existing || existing.archivedAt) return null;
  const archived = { ...existing, archivedAt: new Date() };
  syncMaps(archived);
  return archived;
};

export const restore = (id) => {
  const existing = byId.get(id);
  if (!existing) return null;
  const restored = { ...existing, archivedAt: null };
  syncMaps(restored);
  return restored;
};
