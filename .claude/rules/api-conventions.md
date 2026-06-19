---
paths:
  - "src/**/*.js"
---

# API Development Rules

When editing any file under src/:

- All route handlers must be wrapped with catchAsync from src/middleware/catchAsync.js
- Validators must be imported from src/validators/ — never define validation inline in routes
- The response envelope { success, data, error } must be used for every JSON response
- Never assign to req.body directly; use destructuring to pick only known fields
- status field must be validated against the enum: active | inactive | discontinued
- archivedAt must never be settable by the caller — it is internal state only
- id and createdAt must never be writable via PATCH or POST body
