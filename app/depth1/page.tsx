import { getStoryblokApi } from "@/lib/storyblok";
import { StoryblokStory } from "@storyblok/react/rsc";

export default async function Depth1Page() {
    const storyblokApi = getStoryblokApi();
    const {data} = await storyblokApi.get("cdn/stories/depth1", {
        version: "draft",
    });

    return (
        <div>
            <h1>Depth1 Page Static Title</h1>

            <StoryblokStory story={data.story} />
        </div>
    )
}