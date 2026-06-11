import { storyblokEditable, StoryblokServerComponent } from "@storyblok/react/rsc";

export default function Header({ blok }: { blok: any }) {
    return (
        <div {...storyblokEditable(blok)}>
            {blok.body?.map((item: any) => (
                <StoryblokServerComponent blok={item} key={item._uid} />
            ))}
        </div>
    )
}