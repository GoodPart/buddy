import { storyblokEditable, StoryblokServerComponent } from "@storyblok/react/rsc";
export default function Product({ blok }: { blok: any }) {
    console.log(blok);
    return (
        <div {...storyblokEditable(blok)}>
            <h2>{blok.title}</h2>
            <div className="grid grid-cols-3 gap-4">
                {blok.products?.map((item: any) => (
                    <StoryblokServerComponent blok={item} key={item._uid} />
                ))}
            </div>
            {/* {blok.products.map((item: any) => (
                <StoryblokServerComponent blok={item} key={item._uid} />
            ))} */}
        </div>
    )
}