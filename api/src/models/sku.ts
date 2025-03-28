export default interface SKU {
    sku: string;
    name: string | null;
    productId: string | null;
    attributes: {
        [attribute: string]: string
    }
}