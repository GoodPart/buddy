// 상품 아이템 컴포넌트 (스토리블록과 매핑)
import { storyblokEditable } from "@storyblok/react/rsc";
import ProductComponent from "../product/Product";

export default function ProductItem({ blok }: { blok: any }) {
  return (
    <div {...storyblokEditable(blok)}>
      <ProductComponent
        name={blok.name}
        description={blok.description}
        price={blok.price}
        image={blok.image?.filename}
      />
    </div>
  );
}