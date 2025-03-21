import dotenv from 'dotenv';
import { inventoryDbPool } from './db';

dotenv.config();

type AttributesDictionary = {
    byId: { [key: number]: string },
    byLowercaseAttribute: { [key: string] : number }
};

class _attributes {
    private attributes_dictionary: AttributesDictionary = {
        byId: {},
        byLowercaseAttribute: {}
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
            byLowercaseAttribute: Object.fromEntries(result.rows.map(({ id, attribute }) => [attribute.toLowerCase(), id]))
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
        // TODO:
        // write a store procedure for this

        // use accessor, since they might not be loaded yet
        const all_attributes = await this.getAllAttributes()

        const lowercaseList = Object.keys(all_attributes.byLowercaseAttribute);
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
const Attributes = new _attributes();
export default Attributes;