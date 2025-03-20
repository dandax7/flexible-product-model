import express, { Request, Response } from 'express';
import 'express-async-errors';
import dotenv from 'dotenv';
import { inventoryDbPool } from './db';

import { Product } from './models/product';
//import { SKU } from './models/sku';

dotenv.config();

const app = express();
app.use(express.json());


// GET /api/product/:p
app.get('/api/product/:id', async (req: Request, res: Response) => {
    const SQL = 'SELECT product_id AS "productId", name AS "name" FROM products WHERE product_id = $1';
    const productId : string = req.params.id;
    const result = await inventoryDbPool.query(SQL, [productId]);
    if (!result.rows.length) return res.status(404).json({ error: 'ProductId ' + productId + ' not found' });
    // TODO: validate results.rows[0] conforms to Product shape
    let product : Product = result.rows[0];

    return res.json(product);
  });

/*
// PUT /api/product/:p
app.put('/api/product/:p', (req: Request, res: Response) => {
  const { p } = req.params;
  products[p] = req.body;
  res.json({ success: true, data: products[p] });
});

// GET /api/attributes
app.get('/api/attributes', (_req: Request, res: Response) => {
  res.json(attributes);
});

// PUT /api/attributes
app.put('/api/attributes', (req: Request, res: Response) => {
  attributes = req.body;
  res.json({ success: true, data: attributes });
});

// GET /api/get-sku/:sku
app.get('/api/get-sku/:sku', (req: Request, res: Response) => {
  const { sku } = req.params;
  const skuData = skus[sku];
  res.json(skuData ?? { error: 'SKU not found' });
});

// PUT /api/get-sku/:sku
app.put('/api/get-sku/:sku', (req: Request, res: Response) => {
  const { sku } = req.params;
  skus[sku] = req.body;
  res.json({ success: true, data: skus[sku] });
});
*/

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
  
    res.status(500).json({
      error: 'Internal Server Error'
    });
  });

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
