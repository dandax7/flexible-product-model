import dotenv from 'dotenv';
import { inventoryDbPool } from './db';

dotenv.config();

type AttributesDictionary = { [key: number]: string };

class _attributes {
    private attributes_dictionary: AttributesDictionary = {}
    private lastTimestamp: number | undefined;
    private cacheTimeoutMSec: number;

    constructor() {
        this.cacheTimeoutMSec = parseInt(process.env.INVENTORY_ATTRIBUTES_CACHE_SEC || '10') * 1000;
    }

    private async getFromDB(): Promise<AttributesDictionary> {
        console.log("Fetching from database...");

        const SQL =
        'SELECT id, attribute \
         FROM attribute_dictionary \
         WHERE dtime IS NULL';

        const result = await inventoryDbPool.query(SQL);
        // TODO: handle DB errors better

        return Object.fromEntries(result.rows.map(({ id, attribute }) => [id, attribute]));
    }

    public async getAllAttributes(): Promise<AttributesDictionary> {
        const now = Date.now();
        if (!this.lastTimestamp ||
            this.lastTimestamp + this.cacheTimeoutMSec < now) {
                // even thow it's async it's thread safe
                // if two async events have a cache miss at the same time
                // they will both fetch from DB and overwrite global
                // attributes_dictionary with identical values
                // to reduce the likelyhood of this we stamp before DB
                this.lastTimestamp = now;
                this.attributes_dictionary = await this.getFromDB();
        }

        return this.attributes_dictionary;
    }
}
  
// Export a single shared instance
const attributes = new _attributes();
export default attributes;
  