---
paths:
  - "tests/**/*.js"
---

# Testing Rules

When editing any file under tests/:

- Use node:test and node:assert/strict — do not import Jest or Mocha
- Import the Express app from src/app.js, never from src/index.js
- Call productModel.clearAll() inside beforeEach to reset state between tests
- Each test must be independent — do not share product IDs across tests
- Seed realistic data: use different categories, prices, and stock levels
- Assert both the HTTP status code and the response envelope shape
