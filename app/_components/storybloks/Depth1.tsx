import { storyblokEditable, StoryblokServerComponent } from "@storyblok/react/rsc";
import Depth1Form from "../depth1/Depth1";

export default function Depth1({ blok }: { blok: any }) {
    return (
        <div className="depth1" {...storyblokEditable(blok)}>
            <Depth1Form blok={blok} />

            {blok.body?.map((brand: any) => (
                <StoryblokServerComponent blok={brand} key={brand._uid} />

            ))}
            {/* <LendingBrand blok={blok.brandList[0]} />

            <Banner blok={blok.banner[0]} /> */}
        </div>
    )
}