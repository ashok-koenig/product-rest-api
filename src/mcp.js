// src/mcp.js
// MCP HTTP endpoint for the Product Management API.
// Uses Streamable HTTP transport (MCP spec 2025-03-26).
// Mounted at /mcp by src/app.js.

import { Router }                       from 'express';
import { McpServer }                    from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport }
  from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z }                             from 'zod';
import * as productModel             from './models/product.js';

// ── API key guard middleware ─────────────────────────────────
const MCP_API_KEY = process.env.MCP_API_KEY ?? '';

function requireApiKey(req, res, next) {
  if (!MCP_API_KEY) return next();             // key not set = open
  const provided = req.headers['x-mcp-api-key'] ?? '';
  if (provided !== MCP_API_KEY) {
    return res.status(401).json({ error: 'Unauthorised' });
  }
  next();
}

// ── Build a fresh McpServer for every HTTP request ───────────
// Stateless mode (sessionIdGenerator: undefined) is correct for
// HTTP MCP servers — each JSON-RPC call is self-contained.
function buildMcpServer() {
  const server = new McpServer({
    name:    'product-mcp-server',
    version: '1.0.0',
  });

  // ── Tool: list_products ────────────────────────────────────
  server.registerTool(
    'list_products',
    {
      description:
        'List products from the catalogue with optional filters. ' +
        'Supported: category, status, minPrice, maxPrice, inStock, search.',
      inputSchema: {
        category: z.enum([
          'electronics', 'clothing', 'food', 'books', 'other'
        ]).optional(),
        status: z.enum([
          'active', 'inactive', 'discontinued'
        ]).optional(),
        minPrice: z.number().positive().optional(),
        maxPrice: z.number().positive().optional(),
        inStock:  z.boolean().optional(),
        search:   z.string().optional(),
      },
    },
    async (filters) => {
      const products = productModel.findAll(filters);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, data: products }, null, 2),
        }],
      };
    }
  );

  // ── Tool: create_product ───────────────────────────────────
  server.registerTool(
    'create_product',
    {
      description:
        'Create a new product in the catalogue. ' +
        'Returns the created product with its generated id and createdAt.',
      inputSchema: {
        name:        z.string().min(1).max(150),
        sku:         z.string().regex(/^[A-Z0-9-]{3,20}$/),
        description: z.string().optional(),
        category:    z.enum([
          'electronics', 'clothing', 'food', 'books', 'other'
        ]),
        price:  z.number().positive(),
        stock:  z.number().int().nonnegative(),
        status: z.enum([
          'active', 'inactive', 'discontinued'
        ]).optional(),
      },
    },
    async (data) => {
      try {
        const product = productModel.create(data);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, data: product }, null, 2),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tool: get_product ──────────────────────────────────────
  server.registerTool(
    'get_product',
    {
      description: 'Fetch a single product by its UUID id.',
      inputSchema: { id: z.string().uuid() },
    },
    async ({ id }) => {
      const product = productModel.findById(id);
      if (!product) {
        return {
          content: [{ type: 'text', text: `Product ${id} not found.` }],
          isError: true,
        };
      }
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, data: product }, null, 2),
        }],
      };
    }
  );

  // ── Resource: product://catalogue ─────────────────────────
  server.registerResource(
    'catalogue',
    'product://catalogue',
    {
      name:        'Product Catalogue',
      description: 'Live snapshot of all active products from the in-memory store.',
      mimeType:    'application/json',
    },
    async (uri) => {
      const products = productModel.findAll({ status: 'active' });
      return {
        contents: [{
          uri:      uri.href,
          mimeType: 'application/json',
          text:     JSON.stringify(products, null, 2),
        }],
      };
    }
  );

  // ── Resource: product://stats ──────────────────────────────
  server.registerResource(
    'stats',
    'product://stats',
    {
      name:        'Catalogue Statistics',
      description: 'Aggregated counts of products by category and status.',
      mimeType:    'application/json',
    },
    async (uri) => {
      const all = productModel.findAll({});
      const byCategory = {};
      const byStatus   = {};
      for (const p of all) {
        byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
        byStatus[p.status]     = (byStatus[p.status]     ?? 0) + 1;
      }
      const stats = {
        total: all.length,
        byCategory,
        byStatus,
        outOfStock: all.filter(p => p.stock === 0).length,
      };
      return {
        contents: [{
          uri:      uri.href,
          mimeType: 'application/json',
          text:     JSON.stringify(stats, null, 2),
        }],
      };
    }
  );

  // ── Prompt: seed_catalogue ────────────────────────────────
  server.registerPrompt(
    'seed_catalogue',
    {
      name:        'Seed Catalogue',
      description: 'Ask Claude to create realistic test products covering all categories.',
      arguments: [{
        name:     'count',
        description: 'Number of products to create (default 8)',
        required: false,
      }],
    },
    async ({ count }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: [
            `Create ${parseInt(count ?? '8', 10)} products using the create_product tool.`,
            'Cover all five categories: electronics, clothing, food, books, other.',
            'Mix status values: active, inactive, discontinued.',
            'Include at least one product with stock = 0.',
            'Use SKU format CATEGORY-NNN (e.g. ELEC-001).',
            'Vary prices from under $10 to over $200.',
            'Report a summary table when done: Name | SKU | Category | Price | Stock.',
          ].join('\n'),
        },
      }],
    })
  );

  // ── Prompt: review_schema ─────────────────────────────────
  server.registerPrompt(
    'review_schema',
    {
      name:        'Review Schema',
      description: 'Ask Claude to verify deployed API responses match the product schema.',
      arguments:   [],
    },
    async () => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: [
            'Use list_products to fetch the catalogue.',
            'Check every returned product against the expected schema:',
            '  id (UUID), name, sku, description (optional), category,',
            '  price, stock, status, createdAt, archivedAt.',
            'Report any missing or unexpected fields as a table.',
          ].join('\n'),
        },
      }],
    })
  );

  return server;
}

// ── Express router ────────────────────────────────────────────
export function createMcpRouter() {
  const router = Router();

  // All MCP JSON-RPC traffic arrives as POST /mcp
  router.post('/', requireApiKey, async (req, res) => {
    try {
      const server    = buildMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,   // stateless — correct for HTTP
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error('MCP error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // Return 405 for non-POST methods
  router.all('/', (req, res) => {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
  });

  return router;
}
