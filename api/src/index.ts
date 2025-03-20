import express, { Request, Response } from 'express';
import 'express-async-errors';
import dotenv from 'dotenv';

import { inventoryDbPool } from './db';
import { Product } from './models/product';
//import { SKU } from './models/sku';

dotenv.config();

const app = express();
app.use(express.json());


app.get('/api/product/:id', async (req: Request, res: Response) => {
    const SQL = 
    'SELECT product_id AS "productId", name AS "name" \
      FROM products \
      WHERE product_id = $1 \
      AND dtime IS NULL';
    const productId : string = req.params.id;
    const result = await inventoryDbPool.query(SQL, [productId]);
    if (!result.rows.length) return res.status(404).json({ error: `ProductId ${productId} not found` });

    // TODO: validate results.rows[0] conforms to Product shape    
    let product : Product = result.rows[0];

    return res.json(product);
  });

// PUT /api/product/:id
// UPSERT for idempotancy
app.put('/api/product/:id', async (req: Request, res: Response) => {
    const SQL =
    'INSERT INTO products (product_id, name) \
     VALUES ($1, $2) \
     ON CONFLICT (product_id) \
     DO UPDATE SET  \
        product_id = EXCLUDED.product_id, \
        name =  EXCLUDED.name, \
        utime = CURRENT_TIMESTAMP';
    const productId : string = req.params.id;
    const body : Product = req.body;
    
    console.log(req.params, req.body);

    // TODO: ensure body is proper shape, for now we allow to have productId be ommited
    // since it's part of the URL 
    if (body.productId === undefined) {
        body.productId = productId;
    } else {
        return res.status(400).json({ error: "URL/payload mismatch"});
    }

    // TODO: handle a DB error differently then 500
    await inventoryDbPool.query(SQL, [body.productId, body.name]);

    // TODO: should we return data on PUT ?
    return res.status(204).json({});
});

/*
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
