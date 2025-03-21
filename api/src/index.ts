import express, { Request, Response } from 'express';
import 'express-async-errors';

import { inventoryDbPool } from './db';
import Attributes from './attributes';

import Product from './models/product';
import SKU from './models/sku';

const app = express();
app.use(express.json());


app.get('/api/product/:id', async (req: Request, res: Response) => {
    const SQL = 
    'SELECT product_id, name \
      FROM products \
      WHERE product_id = $1 \
      AND dtime IS NULL';
    const productId : string = req.params.id;

    console.log(req.params, req.body);

    const result = await inventoryDbPool.query(SQL, [productId]);
    if (!result.rows.length) return res.status(404).json({ error: `ProductId ${productId} not found` });

    // TODO: validate better
    let product : Product = {
        productId: result.rows[0].product_id,
        name: result.rows[0].name
    };

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

app.get('/api/attributes', async (req: Request, res: Response) => {
    const attributes_map = await Attributes.getAllAttributes();
    return res.status(200).json(Object.keys(attributes_map.byAttribute));
});

app.patch('/api/attributes', async (req: Request, res: Response) => {
    const newAttributes : string[] = req.body;
    const attributes_map = await Attributes.addNewAttributes(newAttributes)
    return res.status(200).json(Object.keys(attributes_map.byAttribute));
});

app.get('/api/sku/:sku', async (req: Request, res: Response) => {
    const SQL1 =
    'SELECT skus.sku, products.name \
     FROM skus \
     JOIN products ON products.product_id = skus.product_id \
     WHERE skus.sku = $1';

    const sku : string = req.params.sku;
    const result1 = await inventoryDbPool.query(SQL1, [sku]);
    if (!result1.rows.length) return res.status(404).json({ error: `SKU ${sku} not found` });

    console.log(result1.rows[0]);

    const sku_with_attr : SKU = {
        sku: result1.rows[0]['sku'],
        name: result1.rows[0]['name'],
        productName: result1.rows[0]['name'],
        attributes: {}
    };
    
    const SQL2 = 
    'SELECT sku, id, value \
     FROM sku_attributes \
     WHERE sku = $1 \
     ORDER BY id \
     ';

     // ORDER BY is needed to create consitent results
     const result2 = await inventoryDbPool.query(SQL2, [sku]);
     if (result2.rows.length) {
        const attributes = await Attributes.getAllAttributes()
        const byId = attributes.byId
        result2.rows.forEach(row => {
            // TODO: this shouldn't happen, warn if it does
            const attrName : string = byId[row.id] ?? `Undefined-${row.id}`;
            sku_with_attr.attributes[attrName] = row.value ?? 'Missing';
        });
        const append = Object.values(sku_with_attr.attributes).join(",");
        if (append) sku_with_attr.name += ` (${append})`;
     }

     return res.json(sku_with_attr);
})

/*

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
