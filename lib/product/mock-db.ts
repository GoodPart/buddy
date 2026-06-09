export type DbProduct = {
    sku: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    image: string;
  };
  
  export const MOCK_PRODUCTS: DbProduct[] = [
    {
      sku: "SHOE-001",
      name: "에어맥스 90",
      description: "클래식 운동화",
      price: 159000,
      stock: 12,
      image: "https://via.placeholder.com/200",
    },
    {
      sku: "BAG-002",
      name: "캔버스 백",
      description: "데일리 백",
      price: 45000,
      stock: 0,
      image: "https://via.placeholder.com/200",
    },
    {
      sku: "HAT-003",
      name: "볼캡",
      description: "유니섹스 모자",
      price: 29000,
      stock: 5,
      image: "https://via.placeholder.com/200",
    },
  ];