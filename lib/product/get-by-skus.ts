import { MOCK_PRODUCTS, DbProduct } from "./mock-db";

export function getProductsBySkus(skus: string[]): DbProduct[] {
  return MOCK_PRODUCTS.filter((p) => skus.includes(p.sku));
}

export function getProductBySku(sku: string): DbProduct | undefined {
  return MOCK_PRODUCTS.find((p) => p.sku === sku);
}