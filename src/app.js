import express from 'express';
import productsRouter from './routes/products.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createMcpRouter } from './mcp.js';

const app = express();

app.use(express.json());
app.use('/products', productsRouter);

// MCP endpoint — add this line 
app.use('/mcp', createMcpRouter());
app.use(errorHandler);

export default app;
