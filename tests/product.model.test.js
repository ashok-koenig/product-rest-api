import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  create,
  findAll,
  findById,
  findBySku,
  update,
  archiveById,
  restore,
  _reset,
} from '../src/models/product.js';

describe('product model', () => {
  beforeEach(() => _reset());

  describe('create()', () => {
    it('returns a product with all required fields including a uuid id', () => {
      const p = create({ name: 'Widget', sku: 'WGT-001', price: 9.99 });
      assert.match(p.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      assert.equal(p.name, 'Widget');
      assert.equal(p.sku, 'WGT-001');
      assert.equal(p.price, 9.99);
      assert.ok(p.createdAt instanceof Date);
    });

    it('sets status to "active" and archivedAt to null by default', () => {
      const p = create({ name: 'Widget', sku: 'WGT-001' });
      assert.equal(p.status, 'active');
      assert.equal(p.archivedAt, null);
    });

    it('throws if name is missing', () => {
      assert.throws(() => create({ sku: 'WGT-001', price: 9.99 }), { status: 400 });
    });

    it('throws if sku is missing', () => {
      assert.throws(() => create({ name: 'Widget', price: 9.99 }), { status: 400 });
    });

    it('throws if price is zero or negative', () => {
      assert.throws(() => create({ name: 'Widget', sku: 'WGT-001', price: 0 }), { status: 400 });
      assert.throws(() => create({ name: 'Widget', sku: 'WGT-002', price: -5 }), { status: 400 });
    });

    it('throws if a product with the same sku already exists', () => {
      create({ name: 'Widget', sku: 'WGT-001' });
      assert.throws(() => create({ name: 'Widget Clone', sku: 'WGT-001' }), { status: 409 });
    });

    it('accepts stock = 0 (out of stock is valid)', () => {
      const p = create({ name: 'Widget', sku: 'WGT-001', stock: 0 });
      assert.equal(p.stock, 0);
    });
  });

  describe('findAll({})', () => {
    it('returns all non-archived products', () => {
      create({ name: 'Alpha', sku: 'A-001' });
      create({ name: 'Beta', sku: 'B-001' });
      const c = create({ name: 'Gamma', sku: 'C-001' });
      archiveById(c.id);

      assert.equal(findAll().length, 2);
    });

    it('returns empty array when the store is empty', () => {
      assert.deepEqual(findAll(), []);
    });
  });

  describe('findAll({ category })', () => {
    it('returns only products matching the category', () => {
      create({ name: 'Phone', sku: 'PH-001', category: 'electronics' });
      create({ name: 'Shirt', sku: 'SH-001', category: 'clothing' });

      const results = findAll({ category: 'electronics' });
      assert.equal(results.length, 1);
      assert.equal(results[0].category, 'electronics');
    });
  });

  describe('findAll({ minPrice, maxPrice })', () => {
    it('returns products with price within the range (inclusive)', () => {
      create({ name: 'Cheap', sku: 'CH-001', price: 5.00 });
      create({ name: 'Mid', sku: 'MD-001', price: 15.00 });
      create({ name: 'Expensive', sku: 'EX-001', price: 50.00 });

      const results = findAll({ minPrice: 5, maxPrice: 15 });
      assert.equal(results.length, 2);
      assert.ok(results.every(p => p.price >= 5 && p.price <= 15));
    });
  });

  describe('findAll({ inStock: "true" })', () => {
    it('returns only products with stock > 0', () => {
      create({ name: 'In Stock', sku: 'IS-001', stock: 10 });
      create({ name: 'Out of Stock', sku: 'OS-001', stock: 0 });

      const results = findAll({ inStock: 'true' });
      assert.equal(results.length, 1);
      assert.equal(results[0].sku, 'IS-001');
    });
  });

  describe('findAll({ search })', () => {
    it('returns products whose name or description contains the term', () => {
      create({ name: 'Wireless Mouse', sku: 'WM-001', description: 'Bluetooth mouse' });
      create({ name: 'USB Hub', sku: 'UH-001', description: 'Connect wireless devices' });
      create({ name: 'HDMI Cable', sku: 'HC-001', description: 'Video cable' });

      const results = findAll({ search: 'wireless' });
      assert.equal(results.length, 2);
      assert.ok(results.every(p =>
        p.name.toLowerCase().includes('wireless') ||
        p.description.toLowerCase().includes('wireless')
      ));
    });
  });

  describe('findById(id)', () => {
    it('returns the correct product', () => {
      const p = create({ name: 'Widget', sku: 'WGT-001' });
      assert.deepEqual(findById(p.id), p);
    });

    it('returns null for unknown id', () => {
      assert.equal(findById('00000000-0000-0000-0000-000000000000'), null);
    });

    it('returns null for an archived product id', () => {
      const p = create({ name: 'Widget', sku: 'WGT-001' });
      archiveById(p.id);
      assert.equal(findById(p.id), null);
    });
  });

  describe('findBySku(sku)', () => {
    it('returns the correct product', () => {
      const p = create({ name: 'Widget', sku: 'WGT-001' });
      assert.equal(findBySku('WGT-001').id, p.id);
    });

    it('returns null for unknown sku', () => {
      assert.equal(findBySku('UNKNOWN-SKU'), null);
    });
  });

  describe('update(id, patch)', () => {
    it('updates only the provided fields', () => {
      const p = create({ name: 'Widget', sku: 'WGT-001', price: 9.99 });
      const updated = update(p.id, { price: 14.99 });
      assert.equal(updated.price, 14.99);
      assert.equal(updated.name, 'Widget');
      assert.equal(updated.sku, 'WGT-001');
    });

    it('does not allow overwriting id or createdAt', () => {
      const p = create({ name: 'Widget', sku: 'WGT-001' });
      const updated = update(p.id, { id: 'fake-id', createdAt: new Date('2000-01-01'), name: 'Updated' });
      assert.equal(updated.id, p.id);
      assert.deepEqual(updated.createdAt, p.createdAt);
      assert.equal(updated.name, 'Updated');
    });

    it('strips unknown fields from the patch', () => {
      const p = create({ name: 'Widget', sku: 'WGT-001' });
      const updated = update(p.id, { name: 'Updated', foo: 'bar', baz: 123 });
      assert.equal(updated.name, 'Updated');
      assert.equal(updated.foo, undefined);
      assert.equal(updated.baz, undefined);
    });

    it('returns null for an archived product', () => {
      const p = create({ name: 'Widget', sku: 'WGT-001' });
      archiveById(p.id);
      assert.equal(update(p.id, { name: 'Updated' }), null);
    });
  });

  describe('delete(id) / archiveById(id)', () => {
    it('sets archivedAt (soft archive, record is kept)', () => {
      const p = create({ name: 'Widget', sku: 'WGT-001' });
      const archived = archiveById(p.id);
      assert.ok(archived.archivedAt instanceof Date);
    });

    it('archived product is excluded from findAll()', () => {
      const p = create({ name: 'Widget', sku: 'WGT-001' });
      archiveById(p.id);
      assert.equal(findAll().length, 0);
    });
  });

  describe('restore(id)', () => {
    it('clears archivedAt', () => {
      const p = create({ name: 'Widget', sku: 'WGT-001' });
      archiveById(p.id);
      const restored = restore(p.id);
      assert.equal(restored.archivedAt, null);
    });

    it('restored product reappears in findAll()', () => {
      const p = create({ name: 'Widget', sku: 'WGT-001' });
      archiveById(p.id);
      restore(p.id);
      assert.equal(findAll().length, 1);
    });

    it('returns null if the product is not archived', () => {
      const p = create({ name: 'Widget', sku: 'WGT-001' });
      assert.equal(restore(p.id), null);
    });
  });
});
