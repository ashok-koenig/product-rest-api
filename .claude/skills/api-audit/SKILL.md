---
name: api-audit
description: Run a security and performance audit on the Product API. Use when asked to review, audit, or check the API for vulnerabilities or bottlenecks.
allowed-tools: Read Grep
---

## Files under review

### src/controllers/productController.js
!`cat src/controllers/productController.js`

### src/models/product.js
!`cat src/models/product.js`

### src/validators/productValidator.js
!`cat src/validators/productValidator.js`

## Audit checklist

Review the files above and check each item. Report severity as Low / Medium / High.

### Security
- Mass assignment: can a caller set id, createdAt, or archivedAt via request body?
- Input validation: are all required fields validated before the model is called?
- SKU enumeration: does findBySku expose whether a private SKU exists?
- Sensitive field exposure: is archivedAt visible in API responses to consumers?
- Search injection: is the partial-match search safe against regex or injection attacks?

### Performance
- findAll() complexity: is it O(n) per call with no indexing?
- Are Maps used for O(1) lookups by id and sku?
- Are there any synchronous blocking operations inside async handlers?

### Code quality
- Are all async handlers using catchAsync?
- Is validation kept out of route handlers and controllers?

Format your output as a table: Finding | Severity | Location | Recommended Fix
