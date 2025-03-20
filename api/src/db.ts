import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.INVENTORY_DB) {
    throw new Error('Missing required environment variable: INVENTORY_DB');
}

export const inventoryDbPool = new Pool({
  connectionString: process.env.INVENTORY_DB,
});
