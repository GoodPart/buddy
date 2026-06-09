import { storyblokEditable, StoryblokServerComponent } from "@storyblok/react/rsc";
import Link from "next/link";
export default function LendingBrand({ blok }: { blok: any }) {
    const {lendingItem} = blok.story.content.body[0];
    const {sectionTitle} = blok.story.content.body[0];
    return (
        <div className="lending-brand max-w-[1156px] mx-auto py-8" {...storyblokEditable(blok)}>
            <h2 className="text-2xl font-bold">{sectionTitle}</h2>
            <div className="container flex flex-wrap gap-10 mt-">
                {lendingItem.map((item: any) => (
                    <div key={item.title} >
                        <Link href={item.link} target="_blank" className="flex flex-col items-center justify-center gap-2">
                            <div className="w-[60px] h-[60px] bg-gray-200 rounded-full"></div>  
                            <h2 className="text-2xl font-bold">{item.title}</h2>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}