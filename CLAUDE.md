# Product Management API — Claude Instructions

## Project overview
REST API for an internal product catalogue. Built with Express.js, Node.js v20,
and ES Modules (import/export). In-memory storage only — no database.

## Build and run commands
- Install:  npm install
- Start:    npm start          (port 3000)
- Test:     npm test
- Coverage: npm run test:coverage
- Lint:     npx @redocly/cli lint docs/openapi.yaml

## Folder structure
src/
  index.js          Express entry point (listen only)
  app.js            Express factory (exported, no listen)
  models/           In-memory data store
  controllers/      Request handlers
  routes/           Express routers
  middleware/       catchAsync, errorHandler
  validators/       express-validator chains
docs/
  openapi.yaml      OpenAPI 3.1 spec
tests/
  *.test.js         node:test + supertest

## Response envelope — never deviate from this shape
Success:  { success: true,  data: <payload> }
Error:    { success: false, error: <message> }

## Product schema fields
id, name, sku, description, category, price, stock, status, createdAt, archivedAt
- category enum: electronics | clothing | food | books | other
- status enum:   active | inactive | discontinued
- archivedAt: null means not archived (soft-delete pattern)

## Coding conventions
- ES Modules only: use import/export, never require()
- Async handlers wrapped with catchAsync (src/middleware/catchAsync.js)
- Validators live in src/validators/ — never inline in routes
- HTTP status codes: 200 OK, 201 Created, 204 No Content,
  400 Bad Request, 404 Not Found, 409 Conflict, 422 Unprocessable Entity
- Use uuid v4 for all generated IDs

## Git conventions
- Branch names:   feature/<desc> or fix/<desc>
- Commit prefix:  feat: | fix: | test: | docs: | refactor: | chore:
- Merge strategy: --no-ff to preserve branch history
- Never push directly to main

## Testing conventions
- Framework: node:test + node:assert/strict (Node.js v20 built-in)
- HTTP tests: supertest against src/app.js (not src/index.js)
- Reset store with productModel.clearAll() in beforeEach
- Coverage target: > 85% for files in src/

## Additional instructions
@docs/openapi.yaml   (OpenAPI spec — use as reference for endpoint shapes)
