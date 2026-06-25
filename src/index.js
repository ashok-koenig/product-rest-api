// src/index.js — updated for Render
import app from './app.js';

// Render sets PORT automatically. Fall back to 3000 for local dev.
const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`Product Management API running on port ${PORT}`);
  console.log(`REST API:  http://localhost:${PORT}/products`);
  console.log(`MCP:       http://localhost:${PORT}/mcp`);
});
