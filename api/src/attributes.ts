import dotenv from 'dotenv';
import { inventoryDbPool } from './db';

dotenv.config();

type AttributesDictionary = {
    byId: { [key: number]: string },
    byAttribute: { [key: string] : number },
    lowercaseList: string[]
};

class _attributes {
    private attributes_dictionary: AttributesDictionary = {
        byId: {},
        byAttribute: {},
        lowercaseList: []
    }
    private lastTimestamp: number | undefined;
    private cacheTimeoutMSec: number;

    constructor() {
        this.cacheTimeoutMSec = parseInt(process.env.INVENTORY_ATTRIBUTES_CACHE_SEC || '10') * 1000;
    }

    private async getFromDB(): Promise<AttributesDictionary> {
        const SQL =
        'SELECT id, attribute \
         FROM attribute_dictionary \
         WHERE dtime IS NULL';

        const result = await inventoryDbPool.query(SQL);
        let ret : AttributesDictionary = {
            byId: Object.fromEntries(result.rows.map(({ id, attribute }) => [id, attribute])),
            byAttribute: Object.fromEntries(result.rows.map(({ id, attribute }) => [attribute, id])),
            lowercaseList: result.rows.map(item => item.attribute.toLowerCase())
        };

        console.log("Fetching attributes from database...");
        console.log(ret)
        console.log("Fetching attributes from database...Done");

        return ret;
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

    public async addNewAttributes(attributes : string[]): Promise<AttributesDictionary>  {
        // this may initialize the cache
        const all_attributes = await this.getAllAttributes()

        const lowercaseList = all_attributes.lowercaseList;
        // insert only new ones:
        const newAttrs = attributes.filter(attr => !lowercaseList.includes(attr.toLowerCase()));

        if (newAttrs.length) {
            const newArgs = newAttrs.map((_, i) => `($${i + 1})`).join(',');
            const SQL = `INSERT INTO attribute_dictionary (attribute) VALUES ${newArgs}`

            await inventoryDbPool.query(SQL, newAttrs);

            // refresh
            // TODO: we can possibly avoid this by doing a merge
            this.attributes_dictionary = await this.getFromDB();
            this.lastTimestamp = Date.now();
        }

        // return what we have
        return this.attributes_dictionary
    }
}
  
// Export a single shared instance
const attributes = new _attributes();
export default attributes;