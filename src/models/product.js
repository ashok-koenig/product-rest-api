import { v4 as uuidv4 } from 'uuid';

const CATEGORIES = ['electronics', 'clothing', 'food', 'books', 'other'];
const STATUSES = ['active', 'inactive', 'discontinued'];

const products = [];

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

export const findAll = (filters = {}) => {
  let result = [...products];
  if (filters.category) result = result.filter(p => p.category === filters.category);
  if (filters.status) result = result.filter(p => p.status === filters.status);
  if (filters.name) {
    const query = filters.name.toLowerCase();
    result = result.filter(p => p.name.toLowerCase().includes(query));
  }
  return result;
};

export const findById = (id) => products.find(p => p.id === id) ?? null;

export const findBySku = (sku) => products.find(p => p.sku === sku) ?? null;

export const create = (data) => {
  validate(data, true);

  const existing = findBySku(data.sku);
  if (existing) {
    const err = new Error(`SKU '${data.sku}' already exists`);
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
  };

  products.push(product);
  return product;
};

export const update = (id, patch) => {
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return null;

  validate(patch, false);

  if (patch.sku !== undefined) {
    const dup = findBySku(patch.sku);
    if (dup && dup.id !== id) {
      const err = new Error(`SKU '${patch.sku}' already exists`);
      err.status = 409;
      throw err;
    }
  }

  const updated = { ...products[index], ...patch };
  if (patch.price !== undefined) updated.price = Number(patch.price);
  if (patch.stock !== undefined) updated.stock = Number(patch.stock);

  products[index] = updated;
  return updated;
};

export const deleteById = (id) => {
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return null;
  const [deleted] = products.splice(index, 1);
  return deleted;
};
