import { getStoryblokApi } from "@/lib/storyblok";
import { StoryblokStory } from "@storyblok/react/rsc";
export default async function Page() {
    const storyblokApi = getStoryblokApi();
    const {data} = await storyblokApi.get("cdn/stories/depth1/depth2", {
        version: "draft",
    });
    console.log("depth2 data -->",data);
    return (
        <div>
            depth2 page
            <StoryblokStory story={data.story} />
        </div>
    )
}