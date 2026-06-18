# Product Management API

A lightweight RESTful API built with **Express 5** and **Node.js** for managing a product catalogue. Products can be created, queried, updated, and soft-archived — meaning a deleted product is never truly removed from the store but is hidden from normal responses and its SKU is permanently reserved. All data is held in-memory, making the service ideal for rapid prototyping or coursework without requiring a database.

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Node.js | 20.x |
| npm | 10.x |

---

## Installation

```bash
git clone <repository-url>
cd product-rest-api
npm install
```

---

## Running the server

```bash
npm start
```

The server listens on port **3000**. The port is hardcoded in `src/index.js`; edit `const PORT` in that file to change it.

```
Server running on port 3000
```

---

## Running tests

Run the full test suite:

```bash
npm test
```

Run the suite with a coverage report (requires Node.js 20+):

```bash
npm run test:coverage
```

---

## API endpoints

All endpoints are prefixed with `/products`. Request and response bodies use `application/json`.

| Method | Path | Description | Status codes |
|--------|------|-------------|--------------|
| `GET` | `/products` | List all active products (supports filters) | `200`, `422` |
| `GET` | `/products/:id` | Get a single active product by UUID | `200`, `404` |
| `POST` | `/products` | Create a new product | `201`, `400`, `409`, `422` |
| `PATCH` | `/products/:id` | Partially update a product | `200`, `400`, `404`, `422` |
| `DELETE` | `/products/:id` | Soft-archive a product | `204`, `404` |
| `DELETE` | `/products/:id/restore` | Restore a soft-archived product | `200`, `404` |

### Response format

All responses use a consistent JSON envelope.

**Successful responses** set `success: true` and carry the resource in `data`:

```json
{ "success": true, "data": { ... } }
{ "success": true, "data": [ ... ] }
```

**Error responses** set `success: false` and carry a human-readable message in `error`:

```json
{ "success": false, "error": "Product not found" }
```

The archive endpoint (`DELETE /products/:id`) is the exception — it returns `204 No Content` with no body.

### Example curl commands

**List all products**
```bash
curl http://localhost:3000/products
```

**List products with filters**
```bash
curl "http://localhost:3000/products?category=electronics&inStock=true&maxPrice=999.99"
```

**Get a product by ID**
```bash
curl http://localhost:3000/products/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Create a product**
```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Headphones",
    "sku": "WH-1000XM5",
    "description": "Noise-cancelling over-ear headphones",
    "category": "electronics",
    "price": 349.99,
    "stock": 42,
    "status": "active"
  }'
```

**Update a product**
```bash
curl -X PATCH http://localhost:3000/products/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Content-Type: application/json" \
  -d '{
    "price": 299.99,
    "stock": 30,
    "status": "active"
  }'
```

**Archive (soft-delete) a product**
```bash
curl -X DELETE http://localhost:3000/products/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Restore an archived product**
```bash
curl -X DELETE http://localhost:3000/products/a1b2c3d4-e5f6-7890-abcd-ef1234567890/restore
```

---

## Query parameters — `GET /products`

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `category` | `string` | Exact match against the product category. Must be one of the allowed values. | `?category=electronics` |
| `status` | `string` | Exact match against the product status. Must be one of the allowed values. | `?status=active` |
| `minPrice` | `number` | Inclusive lower bound on price. Products with no price set are excluded. | `?minPrice=10` |
| `maxPrice` | `number` | Inclusive upper bound on price. Products with no price set are excluded. | `?maxPrice=500` |
| `inStock` | `string` | Pass `"true"` to return only products with `stock > 0`; `"false"` for only `stock === 0`. | `?inStock=true` |
| `search` | `string` | Case-insensitive substring search across both `name` and `description`. | `?search=headphone` |
| `name` | `string` | Case-insensitive substring match against product `name` only. | `?name=wireless` |

Allowed values:

- **category**: `electronics`, `clothing`, `food`, `books`, `other`
- **status**: `active`, `inactive`, `discontinued`

---

## Product schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` (UUID) | Auto-generated | Unique identifier assigned on creation. |
| `name` | `string` | Yes | Human-readable product name. Whitespace is trimmed. |
| `sku` | `string` | Yes | Stock-keeping unit. Must be unique across all products, including archived ones. Immutable after creation. |
| `description` | `string` | No | Free-text product description. Defaults to `""`. |
| `category` | `string` \| `null` | No | Product category. Must be one of the allowed values if provided. Defaults to `null`. |
| `price` | `number` \| `null` | No | Unit price. Must be a positive number with at most 2 decimal places. Defaults to `null`. |
| `stock` | `integer` | No | Inventory count. Must be a non-negative integer. Defaults to `0`. |
| `status` | `string` | No | Lifecycle status. Defaults to `"active"`. |
| `createdAt` | `string` (ISO 8601) | Auto-generated | Timestamp set on creation. Immutable after creation. |
| `archivedAt` | `string` (ISO 8601) \| `null` | Auto-managed | Set when a product is soft-archived; `null` for active products. |

---

## Project structure

```
product-rest-api/
├── src/
│   ├── app.js                        # Express app — router and middleware wiring
│   ├── index.js                      # Server entry point — hardcoded port 3000
│   ├── controllers/
│   │   └── productController.js      # Express route handlers
│   ├── middleware/
│   │   ├── catchAsync.js             # Wraps async handlers, forwards errors to next()
│   │   └── errorHandler.js           # Global error handler — formats error responses
│   ├── models/
│   │   └── product.js                # In-memory data store and business logic
│   ├── routes/
│   │   └── products.js               # Route definitions and validator middleware
│   └── validators/
│       └── productValidator.js       # express-validator rule sets
└── tests/
    ├── product.model.test.js         # Unit tests for the model layer
    └── products.api.test.js          # Integration tests against the HTTP API
```

---

## Environment variables

The server does not currently read any environment variables. `PORT` is hardcoded to `3000` in `src/index.js` and `NODE_ENV` has no effect on application behaviour.

| Variable | Status | How to change |
|----------|--------|---------------|
| `PORT` | Hardcoded — `3000` | Edit `const PORT` in `src/index.js`. |
| `NODE_ENV` | Not used | No environment-specific behaviour is applied. |

---

## Contributing

Fork the repository, create a feature branch from `main`, and open a pull request with a clear description of your change and the problem it solves. Ensure `npm test` passes with no failures before submitting, and keep each pull request focused on a single concern so reviews stay manageable.

---

## License

[MIT](https://opensource.org/licenses/MIT)
