import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { _reset } from '../src/models/product.js';

// Two seed products with distinct categories, prices, and stock levels.
const seedProducts = async () => {
  const [r1, r2] = await Promise.all([
    request(app).post('/products').send({
      name: 'Wireless Headphones',
      sku: 'WH-001',
      description: 'Noise-cancelling bluetooth headphones',
      category: 'electronics',
      price: 79.99,
      stock: 15,
    }),
    request(app).post('/products').send({
      name: 'Cotton T-Shirt',
      sku: 'CT-001',
      description: 'Classic fit cotton t-shirt',
      category: 'clothing',
      price: 19.99,
      stock: 0,
    }),
  ]);
  return [r1.body.data, r2.body.data];
};

describe('GET /products', () => {
  let products;

  beforeEach(async () => {
    _reset();
    products = await seedProducts();
  });

  it('returns 200 and an array', async () => {
    const res = await request(app).get('/products');
    assert.equal(res.status, 200);
    assert.ok(res.body.success);
    assert.ok(Array.isArray(res.body.data));
  });

  it('returns only non-archived products', async () => {
    await request(app).delete(`/products/${products[0].id}`);
    const res = await request(app).get('/products');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].id, products[1].id);
  });

  it('?category=electronics returns only matching products', async () => {
    const res = await request(app).get('/products?category=electronics');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].category, 'electronics');
  });

  it('?minPrice and ?maxPrice filter correctly', async () => {
    const res = await request(app).get('/products?minPrice=20&maxPrice=100');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].sku, 'WH-001');
  });

  it('?inStock=true returns products with stock > 0', async () => {
    const res = await request(app).get('/products?inStock=true');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].sku, 'WH-001');
  });

  it('?search=<term> matches on name and description', async () => {
    const res = await request(app).get('/products?search=bluetooth');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].sku, 'WH-001');
  });

  it('?minPrice=abc returns 422 (non-numeric)', async () => {
    const res = await request(app).get('/products?minPrice=abc');
    assert.equal(res.status, 422);
    assert.equal(res.body.success, false);
  });

  it('?category=unknown returns 422 (not in enum)', async () => {
    const res = await request(app).get('/products?category=unknown');
    assert.equal(res.status, 422);
    assert.equal(res.body.success, false);
  });
});

describe('GET /products/:id', () => {
  let products;

  beforeEach(async () => {
    _reset();
    products = await seedProducts();
  });

  it('returns 200 with the correct product', async () => {
    const res = await request(app).get(`/products/${products[0].id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, products[0].id);
    assert.equal(res.body.data.sku, products[0].sku);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).get('/products/00000000-0000-0000-0000-000000000000');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  it('returns 404 for an archived product id', async () => {
    await request(app).delete(`/products/${products[0].id}`);
    const res = await request(app).get(`/products/${products[0].id}`);
    assert.equal(res.status, 404);
  });
});

describe('POST /products', () => {
  beforeEach(() => _reset());

  it('returns 201 with the created product including id and createdAt', async () => {
    const res = await request(app).post('/products').send({
      name: 'New Widget',
      sku: 'NW-001',
      price: 29.99,
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.success);
    assert.ok(res.body.data.id);
    assert.ok(res.body.data.createdAt);
    assert.equal(res.body.data.name, 'New Widget');
    assert.equal(res.body.data.price, 29.99);
  });

  it('returns 422 when name is missing', async () => {
    const res = await request(app).post('/products').send({ sku: 'NW-001', price: 9.99 });
    assert.equal(res.status, 422);
    assert.equal(res.body.success, false);
  });

  it('returns 422 when sku format is invalid', async () => {
    const res = await request(app).post('/products').send({ name: 'Widget', sku: '', price: 9.99 });
    assert.equal(res.status, 422);
    assert.equal(res.body.success, false);
  });

  it('returns 422 when price is negative', async () => {
    const res = await request(app).post('/products').send({ name: 'Widget', sku: 'WGT-001', price: -5 });
    assert.equal(res.status, 422);
    assert.equal(res.body.success, false);
  });

  it('returns 409 when sku already exists', async () => {
    await request(app).post('/products').send({ name: 'Widget', sku: 'WGT-001' });
    const res = await request(app).post('/products').send({ name: 'Widget Clone', sku: 'WGT-001' });
    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  it('returns 422 when price is zero', async () => {
    const res = await request(app).post('/products').send({ name: 'Widget', sku: 'WGT-001', price: 0 });
    assert.equal(res.status, 422);
    assert.equal(res.body.success, false);
  });

  it('returns 201 when stock is zero (out of stock is valid)', async () => {
    const res = await request(app).post('/products').send({ name: 'Widget', sku: 'WGT-001', stock: 0 });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.stock, 0);
  });
});

describe('PATCH /products/:id', () => {
  let products;

  beforeEach(async () => {
    _reset();
    products = await seedProducts();
  });

  it('returns 200 with only the patched fields changed', async () => {
    const res = await request(app)
      .patch(`/products/${products[0].id}`)
      .send({ price: 99.99 });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.price, 99.99);
    assert.equal(res.body.data.name, products[0].name);
    assert.equal(res.body.data.sku, products[0].sku);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app)
      .patch('/products/00000000-0000-0000-0000-000000000000')
      .send({ price: 99.99 });
    assert.equal(res.status, 404);
  });

  it('returns 400 when the body is empty', async () => {
    const res = await request(app)
      .patch(`/products/${products[0].id}`)
      .send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('does not allow updating sku or id', async () => {
    const res = await request(app)
      .patch(`/products/${products[0].id}`)
      .send({ id: 'fake-id', sku: 'NEWSKU-999', name: 'Updated Name' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, products[0].id);
    assert.equal(res.body.data.sku, products[0].sku);
    assert.equal(res.body.data.name, 'Updated Name');
  });

  it('strips unknown fields from the patch', async () => {
    const res = await request(app)
      .patch(`/products/${products[0].id}`)
      .send({ name: 'Updated', foo: 'bar', baz: 123 });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, 'Updated');
    assert.equal(res.body.data.foo, undefined);
    assert.equal(res.body.data.baz, undefined);
  });

  it('returns 404 for an archived product', async () => {
    await request(app).delete(`/products/${products[0].id}`);
    const res = await request(app)
      .patch(`/products/${products[0].id}`)
      .send({ name: 'Should Fail' });
    assert.equal(res.status, 404);
  });
});

describe('DELETE /products/:id', () => {
  let products;

  beforeEach(async () => {
    _reset();
    products = await seedProducts();
  });

  it('returns 204', async () => {
    const res = await request(app).delete(`/products/${products[0].id}`);
    assert.equal(res.status, 204);
  });

  it('subsequent GET /products/:id returns 404', async () => {
    await request(app).delete(`/products/${products[0].id}`);
    const res = await request(app).get(`/products/${products[0].id}`);
    assert.equal(res.status, 404);
  });
});

describe('DELETE /products/:id/restore', () => {
  let products;

  beforeEach(async () => {
    _reset();
    products = await seedProducts();
    await request(app).delete(`/products/${products[0].id}`);
  });

  it('returns 200 and the restored product', async () => {
    const res = await request(app).delete(`/products/${products[0].id}/restore`);
    assert.equal(res.status, 200);
    assert.ok(res.body.success);
    assert.equal(res.body.data.id, products[0].id);
    assert.equal(res.body.data.archivedAt, null);
  });

  it('product reappears in GET /products', async () => {
    await request(app).delete(`/products/${products[0].id}/restore`);
    const res = await request(app).get('/products');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 2);
  });

  it('returns 404 when product is not archived', async () => {
    // products[1] was seeded but never archived
    const res = await request(app).delete(`/products/${products[1].id}/restore`);
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });
});

describe('concurrent requests', () => {
  beforeEach(() => _reset());

  it('only one of two concurrent POSTs with the same SKU succeeds', async () => {
    const [r1, r2] = await Promise.all([
      request(app).post('/products').send({ name: 'Widget A', sku: 'RACE-001' }),
      request(app).post('/products').send({ name: 'Widget B', sku: 'RACE-001' }),
    ]);
    const statuses = [r1.status, r2.status].sort();
    assert.deepEqual(statuses, [201, 409]);
  });
});
