import {getStoryblokApi} from "@/lib/storyblok";
import { StoryblokStory } from "@storyblok/react/rsc";

// import ProductComponent from "../_components/product/ProductList";
import { getProductBySku } from "@/lib/product/get-by-skus";
import { mergeProduct } from "@/lib/product/merge";

export default async function ProductPage() {
    const storyblokApi = getStoryblokApi();
    const { data } = await storyblokApi.get("cdn/stories/product", {
        version: "draft",
    })

     // page body에서 product blok 찾기
    // const productBlok = data.story.content.body?.find(
    //     (b: { component: string }) => b.component === "product-list"
    // );

    // if (!productBlok) {
    //     return <div>product blok 없음</div>;
    // }


    return (
        <>
         {/* <h1>{productBlok.title}</h1> */}

        <div className="grid grid-cols-3 gap-4">
            <StoryblokStory story={data.story} />
            {/* {productBlok.products?.map((item: { _uid: string; sku: string; marketing_title?: string; badge?: string }) => {
            const dbProduct = getProductBySku(item.sku);
            if (!dbProduct) {
                return (
                <p key={item._uid} className="text-red-500">
                    DB에 없는 sku: {item.sku}
                </p>
                );
            }
            const merged = mergeProduct(item, dbProduct);
            return (
                // <div key={item._uid}>
                // {merged.badge && <span>{merged.badge}</span>}
                // <ProductComponent
                //     name={merged.name}
                //     description={merged.description}
                //     price={merged.price}
                //     image={merged.image}
                //     badge={merged.badge}
                // />
                // <p className="text-sm text-gray-500">재고: {merged.stock}</p>
                // </div>
            );
            })} */}
        </div>
        </>
    )
}