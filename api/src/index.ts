import express, { Request, Response } from 'express';
import 'express-async-errors';

import { inventoryDbPool } from './db';
import Attributes from './attributes';

import Product from './models/product';
import SKU from './models/sku';

const app = express();
app.use(express.json());

app.get('/api/product/:name', async (req: Request, res: Response) => {
    const SQL = 
    'SELECT product_name, name \
      FROM products \
      WHERE product_name = $1 \
      AND dtime IS NULL';
    const productName : string = req.params.name;

    const result = await inventoryDbPool.query(SQL, [productName]);
    if (!result.rows.length) return res.status(404).json({ error: `Product ${productName} not found` });

    // TODO: validate better
    let product : Product = {
        productName: result.rows[0].product_name,
        name: result.rows[0].name
    };

    return res.json(product);
  });

// PUT /api/product/:id
// UPSERT for idempotancy
app.put('/api/product/:name', async (req: Request, res: Response) => {
    const SQL =
    'INSERT INTO products (product_name, name) \
     VALUES ($1, $2) \
     ON CONFLICT (product_name) \
     DO UPDATE SET  \
        product_name = EXCLUDED.product_name, \
        name =  EXCLUDED.name, \
        utime = CURRENT_TIMESTAMP';
    const productName : string = req.params.name;
    const body : Product = req.body;

    // TODO: ensure body is proper shape, for now we allow to have productName be ommited
    // since it's part of the URL 
    if (body.productName === undefined) {
        body.productName = productName;
    } else if (body.productName.toLowerCase() != productName.toLowerCase()) {
        return res.status(400).json({ error: "URL/payload mismatch"});
    }

    // TODO: handle a DB error differently then 500
    await inventoryDbPool.query(SQL, [body.productName, body.name]);

    // TODO: should we return data on PUT ?
    return res.status(200).json({});
});

app.get('/api/attributes', async (req: Request, res: Response) => {
    const attributes_map = await Attributes.getAllAttributes();
    return res.status(200).json(Object.values(attributes_map.byId));
});

// Merge additional ones
app.patch('/api/attributes', async (req: Request, res: Response) => {
    const newAttributes : string[] = req.body;
    const attributes_map = await Attributes.addNewAttributes(newAttributes)
    return res.status(200).json(Object.values(attributes_map.byId));
});

app.get('/api/sku/:sku', async (req: Request, res: Response) => {
    const SQL1 =
    'SELECT skus.sku, products.name \
     FROM skus \
     JOIN products ON products.product_name = skus.product_name \
     WHERE skus.sku = $1';

    const sku : string = req.params.sku;
    const result1 = await inventoryDbPool.query(SQL1, [sku]);
    if (!result1.rows.length) return res.status(404).json({ error: `SKU ${sku} not found` });

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

     return res.status(200).json(sku_with_attr);
})


// PUT /api/sku/:sku
// TODO: handle idempotancy
app.put('/api/sku/:sku', async (req: Request, res: Response) => {
    const sku : string = req.params.sku;
    const body : SKU = req.body;
    const attributes = await Attributes.getAllAttributes()
    const byLowercaseAttribute = attributes.byLowercaseAttribute;

    // TODO: ensure body is proper shape, for now we allow to have productName be ommited
    // since it's part of the URL 
    if (body.sku === undefined) {
        body.sku = sku;
    } else if (body.sku.toLowerCase() != sku.toLowerCase()) {
        return res.status(400).json({ error: "URL/payload mismatch"});
    }

    const SQL1 = 'SELECT EXISTS (SELECT 1 FROM products WHERE product_name = $1)';

    // lets make sure we have all the the attributes in the dictionary
    const SQL2 =
    'INSERT INTO skus (sku, product_name) VALUES ($1, $2)'

    let SQL3 =
    'INSERT INTO sku_attributes (sku, id, value) VALUES '

    // ensure product exists
    const result = await inventoryDbPool.query(SQL1, [body.productName]);
    if (!result.rows[0].exists) {
        return res.status(400).json({ error: `Product ${body.productName} does not exist`});
    }

    const client = await inventoryDbPool.connect(); // Get a client from the pool
    try {
        await client.query('BEGIN');
        await client.query(SQL2, [body.sku, body.productName]);

        // TODO: create a helper for these attribute to id params
        let param = 2
        let params : (number | string)[] = [body.sku]
        for (const [attribute, value] of Object.entries(body.attributes)) {
            let id = byLowercaseAttribute[attribute.toLowerCase()];
            if (id === undefined) {
                return res.status(400).json({error: `Unknown ${attribute}`});
            }

            if (param != 2) SQL3 += ',';

            SQL3 += `($1, $${param}, $${param+1})`
            param += 2
            params.push(id)
            params.push(value)
        }
        console.log(SQL3);
        console.log(params);

        if (params.length) await client.query(SQL3, params);

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release(); // Return client to the pool
    }

    // TODO: should we return data on PUT ?
    return res.status(200).json({});
});

// /api/search/sku?size=large&color=white
// TODO: more then just AND
// TODO: add pagination
app.get('/api/search/sku', async (req: Request, res: Response) => {
    const criteria : { } = req.query;

    // map criteria ID's
    const attributes = (await Attributes.getAllAttributes()).byLowercaseAttribute;


    // TODO: create a helper for these attribute to id params
    let SQL = ""
    let param = 1
    let params = []
    for (const [attribute, value] of Object.entries(criteria)) {
        let id = attributes[attribute.toLowerCase()];
        if (id === undefined) {
            return res.status(400).json({error: `Unknown criteria ${attribute}`});
        }

        if (param > 1) SQL += ' INTERSECT '

        SQL += `SELECT sku FROM sku_attributes WHERE id = $${param} AND value = $${param+1}`
        param += 2
        params.push(id)
        params.push(value)
    }

    const result = await inventoryDbPool.query(SQL, params);

    return res.status(200).json(result.rows.map(row => row.sku));
});

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
