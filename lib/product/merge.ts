import { DbProduct } from "./mock-db";

type ProductItemBlok = {
  sku: string;
  marketing_title?: string;
  badge?: string;
};

export type MergedProduct = {
  sku: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  badge?: string;
};

export function mergeProduct(blok: ProductItemBlok, db: DbProduct): MergedProduct {
  return {
    sku: db.sku,
    name: blok.marketing_title || db.name,      // SB 오버라이드 우선
    description: db.description,                 // 설명은 DB
    price: db.price,                             // 가격은 DB
    stock: db.stock,
    image: db.image,
    badge: blok.badge,
  };
}