export default interface SKU {
    sku: string;
    name: string | null;
    productName: string | null;
    attributes: {
        [attribute: string]: string
    }
}